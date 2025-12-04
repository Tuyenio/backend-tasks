import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../entities/task.entity';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { Tag } from '../../entities/tag.entity';
import { TaskReminder } from '../../entities/task-reminder.entity';
import { ChecklistItem } from '../../entities/checklist-item.entity';
import { Attachment } from '../../entities/attachment.entity';
import { Comment } from '../../entities/comment.entity';
import { CommentReaction } from '../../entities/comment-reaction.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Project,
      User,
      Tag,
      TaskReminder,
      ChecklistItem,
      Attachment,
      Comment,
      CommentReaction,
      ActivityLog,
    ]),
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
