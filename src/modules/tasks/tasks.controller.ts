import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist-item.dto';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions('tasks.view')
  findAll(@Query() query: QueryTaskDto) {
    return this.tasksService.findAll(query);
  }

  @Get('statistics')
  @RequirePermissions('tasks.view')
  getStatistics(@Query('projectId') projectId?: string) {
    return this.tasksService.getStatistics(projectId);
  }

  @Get(':id')
  @RequirePermissions('tasks.view')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @RequirePermissions('tasks.create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    return this.tasksService.create(createTaskDto, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('tasks.update')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: any,
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('tasks.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.remove(id, req.user.id);
  }

  // Assignees
  @Post(':id/assignees')
  @RequirePermissions('tasks.assign')
  assignUsers(
    @Param('id') id: string,
    @Body() assignTaskDto: AssignTaskDto,
    @Request() req: any,
  ) {
    return this.tasksService.assignUsers(id, assignTaskDto.userIds, req.user.id);
  }

  @Delete(':id/assignees/:assigneeId')
  @RequirePermissions('tasks.assign')
  @HttpCode(HttpStatus.OK)
  removeAssignee(
    @Param('id') id: string,
    @Param('assigneeId') assigneeId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeAssignee(id, assigneeId, req.user.id);
  }

  // Tags
  @Post(':id/tags')
  @RequirePermissions('tasks.update')
  addTags(
    @Param('id') id: string,
    @Body('tagIds') tagIds: string[],
    @Request() req: any,
  ) {
    return this.tasksService.addTags(id, tagIds, req.user.id);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('tasks.update')
  @HttpCode(HttpStatus.OK)
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeTag(id, tagId, req.user.id);
  }

  // Checklist Items
  @Post(':id/checklist')
  @RequirePermissions('tasks.update')
  @HttpCode(HttpStatus.CREATED)
  addChecklistItem(
    @Param('id') id: string,
    @Body() dto: CreateChecklistItemDto,
    @Request() req: any,
  ) {
    return this.tasksService.addChecklistItem(id, dto, req.user.id);
  }

  @Patch(':id/checklist/:itemId')
  @RequirePermissions('tasks.update')
  updateChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @Request() req: any,
  ) {
    return this.tasksService.updateChecklistItem(id, itemId, dto, req.user.id);
  }

  @Delete(':id/checklist/:itemId')
  @RequirePermissions('tasks.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeChecklistItem(id, itemId, req.user.id);
  }

  // Reminders
  @Post(':id/reminders')
  @RequirePermissions('tasks.update')
  @HttpCode(HttpStatus.CREATED)
  addReminder(
    @Param('id') id: string,
    @Body() dto: CreateReminderDto,
    @Request() req: any,
  ) {
    return this.tasksService.addReminder(id, dto, req.user.id);
  }

  @Delete(':id/reminders/:reminderId')
  @RequirePermissions('tasks.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeReminder(
    @Param('id') id: string,
    @Param('reminderId') reminderId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeReminder(id, reminderId, req.user.id);
  }

  // Comments
  @Post(':id/comments')
  @RequirePermissions('tasks.view')
  @HttpCode(HttpStatus.CREATED)
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.tasksService.addComment(id, dto, req.user.id);
  }

  @Patch(':id/comments/:commentId')
  @RequirePermissions('tasks.view')
  updateComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @Request() req: any,
  ) {
    return this.tasksService.updateComment(id, commentId, dto, req.user.id);
  }

  @Delete(':id/comments/:commentId')
  @RequirePermissions('tasks.view')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeComment(id, commentId, req.user.id);
  }

  // Reactions
  @Post('comments/:commentId/reactions')
  @RequirePermissions('tasks.view')
  @HttpCode(HttpStatus.CREATED)
  addReaction(
    @Param('commentId') commentId: string,
    @Body() dto: AddReactionDto,
    @Request() req: any,
  ) {
    return this.tasksService.addReaction(commentId, dto.emoji, req.user.id);
  }

  @Delete('comments/:commentId/reactions/:reactionId')
  @RequirePermissions('tasks.view')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeReaction(
    @Param('commentId') commentId: string,
    @Param('reactionId') reactionId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeReaction(commentId, reactionId, req.user.id);
  }
}
