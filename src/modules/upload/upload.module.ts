import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { Attachment } from '../../entities/attachment.entity';
import { User } from '../../entities/user.entity';
import * as multer from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, User]),
    MulterModule.register({
      storage: multer.memoryStorage(), // Use memory storage for file.buffer access
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
