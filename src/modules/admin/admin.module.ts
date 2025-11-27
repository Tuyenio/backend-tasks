import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SystemSetting } from '../../entities/system-setting.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { Task } from '../../entities/task.entity';
import { Note } from '../../entities/note.entity';
import { Chat } from '../../entities/chat.entity';
import { Notification } from '../../entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemSetting,
      ActivityLog,
      User,
      Project,
      Task,
      Note,
      Chat,
      Notification,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
