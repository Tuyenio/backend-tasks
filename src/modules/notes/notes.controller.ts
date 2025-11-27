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

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@Body() createNoteDto: CreateNoteDto, @Request() req) {
    return this.notesService.create(createNoteDto, req.user.userId);
  }

  @Get()
  findAll(@Query() query: QueryNoteDto, @Request() req) {
    return this.notesService.findAll(query, req.user.userId);
  }

  @Get('statistics')
  getStatistics(@Request() req) {
    return this.notesService.getStatistics(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.notesService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @Request() req,
  ) {
    return this.notesService.update(id, updateNoteDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.notesService.remove(id, req.user.userId);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Request() req) {
    return this.notesService.duplicate(id, req.user.userId);
  }

  @Patch(':id/toggle-pin')
  togglePin(@Param('id') id: string, @Request() req) {
    return this.notesService.togglePin(id, req.user.userId);
  }

  @Post(':id/share')
  shareNote(
    @Param('id') id: string,
    @Body() shareNoteDto: ShareNoteDto,
    @Request() req,
  ) {
    return this.notesService.shareNote(id, shareNoteDto, req.user.userId);
  }

  @Delete(':id/share/:sharedUserId')
  unshareNote(
    @Param('id') id: string,
    @Param('sharedUserId') sharedUserId: string,
    @Request() req,
  ) {
    return this.notesService.unshareNote(id, sharedUserId, req.user.userId);
  }

  @Post(':id/tags/:tagId')
  addTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Request() req,
  ) {
    return this.notesService.addTag(id, tagId, req.user.userId);
  }

  @Delete(':id/tags/:tagId')
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Request() req,
  ) {
    return this.notesService.removeTag(id, tagId, req.user.userId);
  }
}
