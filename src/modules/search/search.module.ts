import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Task } from '../../entities/task.entity';
import { Project } from '../../entities/project.entity';
import { Note } from '../../entities/note.entity';
import { User } from '../../entities/user.entity';
import { Chat } from '../../entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, Note, User, Chat]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
