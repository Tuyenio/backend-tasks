import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment, AttachmentType } from '../../entities/attachment.entity';
import { User } from '../../entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly avatarDir = path.join(this.uploadDir, 'avatars');
  private readonly attachmentDir = path.join(this.uploadDir, 'attachments');
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly allowedFileTypes = [
    ...this.allowedImageTypes,
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  constructor(
    @InjectRepository(Attachment)
    private attachmentsRepository: Repository<Attachment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    this.ensureUploadDirectories();
  }

  private ensureUploadDirectories() {
    [this.uploadDir, this.avatarDir, this.attachmentDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed for avatars');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Delete old avatar if exists
    if (user.avatarUrl) {
      const oldFilePath = path.join(
        process.cwd(),
        user.avatarUrl.replace('/uploads/', 'uploads/'),
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const filename = this.generateUniqueFilename(file.originalname);
    const filepath = path.join(this.avatarDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    user.avatarUrl = avatarUrl;
    await this.usersRepository.save(user);

    return {
      url: avatarUrl,
      filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    entityType?: string,
    entityId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedFileTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const filename = this.generateUniqueFilename(file.originalname);
    const filepath = path.join(this.attachmentDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const fileUrl = `/uploads/attachments/${filename}`;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    // Save to database
    const attachment = this.attachmentsRepository.create({
      name: file.originalname,
      url: fileUrl,
      size: file.size,
      type: this.getFileTypeFromMimetype(file.mimetype),
      mimeType: file.mimetype,
      uploadedBy: { id: userId } as User,
    });

    await this.attachmentsRepository.save(attachment);

    return {
      id: attachment.id,
      url: fileUrl,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      type: attachment.type,
    };
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    userId: string,
    entityType?: string,
    entityId?: string,
  ) {
    const uploadedFiles: any[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(
          file,
          userId,
          entityType,
          entityId,
        );
        uploadedFiles.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.originalname}:`, error.message);
      }
    }

    return {
      uploaded: uploadedFiles.length,
      files: uploadedFiles,
    };
  }

  async deleteFile(fileId: string, userId: string) {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: fileId },
      relations: ['uploadedBy'],
    });

    if (!attachment) {
      throw new BadRequestException('File not found');
    }

    if (attachment.uploadedBy.id !== userId) {
      throw new BadRequestException('Unauthorized to delete this file');
    }

    const filepath = path.join(
      process.cwd(),
      attachment.url.replace('/uploads/', 'uploads/'),
    );

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    await this.attachmentsRepository.remove(attachment);

    return { message: 'File deleted successfully' };
  }

  async getUserFiles(userId: string, limit: number = 50) {
    return this.attachmentsRepository.find({
      where: { uploadedBy: { id: userId } },
      order: { uploadedAt: 'DESC' },
      take: limit,
    });
  }

  async getFileById(fileId: string) {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: fileId },
      relations: ['uploadedBy'],
    });

    if (!attachment) {
      throw new BadRequestException('File not found');
    }

    return attachment;
  }

  private generateUniqueFilename(originalname: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalname);
    const basename = path.basename(originalname, extension);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, '_');

    return `${sanitizedBasename}_${timestamp}_${randomString}${extension}`;
  }

  private getFileTypeFromMimetype(mimetype: string): AttachmentType {
    if (mimetype.startsWith('image/')) return AttachmentType.IMAGE;
    if (mimetype.startsWith('video/')) return AttachmentType.VIDEO;
    if (mimetype.startsWith('audio/')) return AttachmentType.AUDIO;
    if (
      mimetype.includes('pdf') ||
      mimetype.includes('document') ||
      mimetype.includes('word') ||
      mimetype.includes('excel') ||
      mimetype.includes('sheet') ||
      mimetype.includes('text')
    ) {
      return AttachmentType.DOCUMENT;
    }
    return AttachmentType.OTHER;
  }

  // Placeholder for image optimization
  async optimizeImage(filepath: string): Promise<void> {
    // Would use sharp library for image optimization
    // Example: await sharp(filepath).resize(800).jpeg({ quality: 80 }).toFile(outputPath);
    return;
  }

  // Get storage statistics
  async getStorageStats(userId?: string) {
    const qb = this.attachmentsRepository
      .createQueryBuilder('attachment')
      .leftJoin('attachment.uploadedBy', 'user')
      .select('COALESCE(attachment.type, :otherType)', 'fileType')
      .addSelect('SUM(attachment.size)', 'totalSize')
      .addSelect('COUNT(attachment.id)', 'totalFiles')
      .setParameter('otherType', AttachmentType.OTHER);

    if (userId) {
      qb.where('user.id = :userId', { userId });
    }

    const stats = await qb
      .groupBy('COALESCE(attachment.type, :otherType)')
      .getRawMany();

    const totalSize = stats.reduce(
      (sum, stat) => sum + (parseInt(stat.totalSize || '0') || 0),
      0,
    );
    const totalFiles = stats.reduce(
      (sum, stat) => sum + (parseInt(stat.totalFiles || '0') || 0),
      0,
    );

    return {
      totalSize,
      totalFiles,
      fileCount: totalFiles,
      byType: stats.map((stat) => ({
        type: stat.fileType || AttachmentType.OTHER,
        size: parseInt(stat.totalSize || '0') || 0,
        count: parseInt(stat.totalFiles || '0') || 0,
      })),
    };
  }
}
