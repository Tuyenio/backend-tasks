import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Note } from '../../entities/note.entity';
import { User } from '../../entities/user.entity';
import { Tag } from '../../entities/tag.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNoteDto } from './dto/query-note.dto';
import { ShareNoteDto } from './dto/share-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
  ) {}

  async create(createNoteDto: CreateNoteDto, userId: string): Promise<Note> {
    const creator = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!creator) {
      throw new NotFoundException('Người dùng không tÌm thấy');
    }

    const note = this.notesRepository.create({
      title: createNoteDto.title,
      content: createNoteDto.content,
    });
    note.createdBy = creator;

    // Add tags if provided
    if (createNoteDto.tagIds && createNoteDto.tagIds.length > 0) {
      const tags = await this.tagsRepository.findBy({
        id: In(createNoteDto.tagIds),
      });
      note.tags = tags.map((t) => t.id);
    }

    // Add shared users if provided
    if (
      createNoteDto.sharedWithUserIds &&
      createNoteDto.sharedWithUserIds.length > 0
    ) {
      const users = await this.usersRepository.findBy({
        id: In(createNoteDto.sharedWithUserIds),
      });
      note.sharedWith = users;
    }

    return this.notesRepository.save(note);
  }

  async findAll(query: QueryNoteDto, userId: string) {
    const { search, tagId, isPinned, isShared, page = 1, limit = 20 } = query;

    const qb = this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.createdBy', 'createdBy')
      .leftJoinAndSelect('note.sharedWith', 'sharedWith')
      .where('(note.createdById = :userId OR sharedWith.id = :userId)', {
        userId,
      });

    if (search) {
      qb.andWhere('(note.title ILIKE :search OR note.content ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (tagId) {
      qb.andWhere(':tagId = ANY(note.tags)', { tagId });
    }

    if (isPinned !== undefined) {
      qb.andWhere('note.isPinned = :isPinned', { isPinned });
    }

    if (isShared !== undefined) {
      if (isShared) {
        qb.andWhere('sharedWith.id IS NOT NULL');
      } else {
        qb.andWhere('note.createdById = :userId AND sharedWith.id IS NULL', {
          userId,
        });
      }
    }

    qb.orderBy('note.isPinned', 'DESC')
      .addOrderBy('note.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['createdBy', 'sharedWith'],
    });

    if (!note) {
      throw new NotFoundException('Không tìm thấy ghi chú');
    }

    // Check if user has access to this note
    const hasAccess =
      note.createdBy.id === userId ||
      note.sharedWith?.some((user) => user.id === userId);

    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập ghi chú này');
    }

    return note;
  }

  async update(
    id: string,
    updateNoteDto: UpdateNoteDto,
    userId: string,
  ): Promise<Note> {
    const note = await this.findOne(id, userId);

    // Only creator can update the note
    if (note.createdBy.id !== userId) {
      throw new ForbiddenException('Chỉ có người tạo mới có thể cập nhật ghi chú này');
    }

    Object.assign(note, updateNoteDto);
    return this.notesRepository.save(note);
  }

  async remove(id: string, userId: string): Promise<void> {
    const note = await this.findOne(id, userId);

    // Only creator can delete the note
    if (note.createdBy.id !== userId) {
      throw new ForbiddenException('Chỉ có người tạo mới có thể xóa ghi chú này');
    }

    await this.notesRepository.remove(note);
  }

  async duplicate(id: string, userId: string): Promise<Note> {
    const originalNote = await this.findOne(id, userId);

    const creator = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!creator) {
      throw new NotFoundException('Người dùng không tìm thấy');
    }

    const duplicatedNote = this.notesRepository.create({
      title: `${originalNote.title} (Copy)`,
      content: originalNote.content,
      isPinned: false,
    });
    duplicatedNote.createdBy = creator;

    if (originalNote.tags && originalNote.tags.length > 0) {
      duplicatedNote.tags = [...originalNote.tags];
    }

    return this.notesRepository.save(duplicatedNote);
  }

  async togglePin(id: string, userId: string): Promise<Note> {
    const note = await this.findOne(id, userId);

    // Only creator can pin/unpin
    if (note.createdBy.id !== userId) {
      throw new ForbiddenException('Chỉ có người tạo mới có thể ghim/bỏ ghim ghi chú này');
    }

    note.isPinned = !note.isPinned;
    return this.notesRepository.save(note);
  }

  async shareNote(
    id: string,
    shareNoteDto: ShareNoteDto,
    userId: string,
  ): Promise<Note> {
    const note = await this.findOne(id, userId);

    // Only creator can share the note
    if (note.createdBy.id !== userId) {
      throw new ForbiddenException('Chỉ có người tạo mới có thể chia sẻ ghi chú này');
    }

    const users = await this.usersRepository.findBy({
      id: In(shareNoteDto.userIds),
    });

    if (users.length !== shareNoteDto.userIds.length) {
      throw new BadRequestException('Một hoặc nhiều người dùng không tìm thấy');
    }

    // Merge with existing shared users
    const existingUserIds = note.sharedWith?.map((u) => u.id) || [];
    const newUsers = users.filter((u) => !existingUserIds.includes(u.id));

    note.sharedWith = [...(note.sharedWith || []), ...newUsers];

    return this.notesRepository.save(note);
  }

  async unshareNote(
    id: string,
    sharedUserId: string,
    userId: string,
  ): Promise<Note> {
    const note = await this.findOne(id, userId);

    // Only creator can unshare the note
    if (note.createdBy.id !== userId) {
      throw new ForbiddenException('Chỉ có người tạo mới có thể bỏ chia sẻ ghi chú này');
    }

    note.sharedWith = note.sharedWith?.filter((u) => u.id !== sharedUserId);

    return this.notesRepository.save(note);
  }

  async addTag(id: string, tagId: string, userId: string): Promise<Note> {
    const note = await this.findOne(id, userId);

    // Only creator can add tags
    if (note.createdBy.id !== userId) {
      throw new ForbiddenException(
        'Only the creator can add tags to this note',
      );
    }

    const tag = await this.tagsRepository.findOne({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException('Không tìm thấy tag');
    }

    if (!note.tags) {
      note.tags = [];
    }

    // Check if tag already exists
    if (note.tags.includes(tagId)) {
      throw new BadRequestException('Tag đã được thêm vào ghi chú này');
    }

    note.tags.push(tagId);
    return this.notesRepository.save(note);
  }

  async removeTag(id: string, tagId: string, userId: string): Promise<Note> {
    const note = await this.findOne(id, userId);

    // Only creator can remove tags
    if (note.createdBy.id !== userId) {
      throw new ForbiddenException(
        'Only the creator can remove tags from this note',
      );
    }

    note.tags = note.tags?.filter((t) => t !== tagId) || [];
    return this.notesRepository.save(note);
  }

  async getStatistics(userId: string) {
    const totalNotes = await this.notesRepository.count({
      where: { createdBy: { id: userId } },
    });

    const pinnedNotes = await this.notesRepository.count({
      where: { createdBy: { id: userId }, isPinned: true },
    });

    const sharedNotes = await this.notesRepository
      .createQueryBuilder('note')
      .leftJoin('note.sharedWith', 'sharedWith')
      .where('note.createdById = :userId', { userId })
      .andWhere('sharedWith.id IS NOT NULL')
      .getCount();

    return {
      total: totalNotes,
      pinned: pinnedNotes,
      shared: sharedNotes,
    };
  }
}
