import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../../entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
  ) {}

  async findAll(): Promise<Tag[]> {
    return this.tagsRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.tagsRepository.findOne({ where: { id } });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async findByName(name: string): Promise<Tag | null> {
    return this.tagsRepository.findOne({ where: { name } });
  }

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    // Check if tag name already exists
    const existingTag = await this.findByName(createTagDto.name);
    if (existingTag) {
      throw new ConflictException(
        `Tag with name ${createTagDto.name} already exists`,
      );
    }

    const tag = this.tagsRepository.create(createTagDto);
    return this.tagsRepository.save(tag);
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);

    // Check name conflict if name is being changed
    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const existingTag = await this.findByName(updateTagDto.name);
      if (existingTag) {
        throw new ConflictException(
          `Tag with name ${updateTagDto.name} already exists`,
        );
      }
    }

    Object.assign(tag, updateTagDto);
    return this.tagsRepository.save(tag);
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagsRepository.remove(tag);
  }

  async search(query: string): Promise<Tag[]> {
    return this.tagsRepository
      .createQueryBuilder('tag')
      .where('tag.name LIKE :query', { query: `%${query}%` })
      .orderBy('tag.name', 'ASC')
      .limit(20)
      .getMany();
  }
}
