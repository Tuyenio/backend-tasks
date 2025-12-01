import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNoteDto } from './dto/query-note.dto';
import { ShareNoteDto } from './dto/share-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @RequirePermissions('notes.create')
  create(@Body() createNoteDto: CreateNoteDto, @Request() req) {
    return this.notesService.create(createNoteDto, req.user.id);
  }

  @Get()
  @RequirePermissions('notes.view')
  findAll(@Query() query: QueryNoteDto, @Request() req) {
    return this.notesService.findAll(query, req.user.id);
  }

  @Get('statistics')
  @RequirePermissions('notes.view')
  getStatistics(@Request() req) {
    return this.notesService.getStatistics(req.user.id);
  }

  @Get(':id')
  @RequirePermissions('notes.view')
  findOne(@Param('id') id: string, @Request() req) {
    return this.notesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('notes.update')
  update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @Request() req,
  ) {
    return this.notesService.update(id, updateNoteDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('notes.delete')
  remove(@Param('id') id: string, @Request() req) {
    return this.notesService.remove(id, req.user.id);
  }

  @Post(':id/duplicate')
  @RequirePermissions('notes.create')
  duplicate(@Param('id') id: string, @Request() req) {
    return this.notesService.duplicate(id, req.user.id);
  }

  @Patch(':id/toggle-pin')
  @RequirePermissions('notes.update')
  togglePin(@Param('id') id: string, @Request() req) {
    return this.notesService.togglePin(id, req.user.id);
  }

  @Post(':id/share')
  @RequirePermissions('notes.update')
  shareNote(
    @Param('id') id: string,
    @Body() shareNoteDto: ShareNoteDto,
    @Request() req,
  ) {
    return this.notesService.shareNote(id, shareNoteDto, req.user.id);
  }

  @Delete(':id/share/:sharedUserId')
  @RequirePermissions('notes.update')
  unshareNote(
    @Param('id') id: string,
    @Param('sharedUserId') sharedUserId: string,
    @Request() req,
  ) {
    return this.notesService.unshareNote(id, sharedUserId, req.user.id);
  }

  @Post(':id/tags/:tagId')
  @RequirePermissions('notes.update')
  addTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Request() req,
  ) {
    return this.notesService.addTag(id, tagId, req.user.id);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('notes.update')
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Request() req,
  ) {
    return this.notesService.removeTag(id, tagId, req.user.id);
  }
}
