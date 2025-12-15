import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('upload')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Không có tệp nào được tải lên');
    }
    return this.uploadService.uploadAvatar(file, req.user.id);
  }

  @Post('file')
  @RequirePermissions('upload.create')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Không có tệp nào được tải lên');
    }
    return this.uploadService.uploadFile(
      file,
      req.user.id,
      entityType,
      entityId,
    );
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Request() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có tệp nào được tải lên');
    }
    return this.uploadService.uploadMultipleFiles(
      files,
      req.user.id,
      entityType,
      entityId,
    );
  }

  @Get('files')
  async getUserFiles(@Query('limit') limit: string = '50', @Request() req) {
    return this.uploadService.getUserFiles(req.user.id, parseInt(limit));
  }

  @Get('files/:id')
  async getFileById(@Param('id') id: string) {
    return this.uploadService.getFileById(id);
  }

  @Delete('files/:id')
  async deleteFile(@Param('id') id: string, @Request() req) {
    return this.uploadService.deleteFile(id, req.user.id);
  }

  @Get('storage/stats')
  async getStorageStats(@Request() req) {
    return this.uploadService.getStorageStats(req.user.id);
  }
}
