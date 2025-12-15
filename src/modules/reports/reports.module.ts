import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ExportService } from './export.service';
import { Task } from '../../entities/task.entity';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { ActivityLog } from '../../entities/activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, User, ActivityLog])],
  controllers: [ReportsController],
  providers: [ReportsService, ExportService],
  exports: [ReportsService],
})
export class ReportsModule {}
