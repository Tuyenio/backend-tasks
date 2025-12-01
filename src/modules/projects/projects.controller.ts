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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { ManageMembersDto } from './dto/manage-members.dto';
import { ManageTagsDto } from './dto/manage-tags.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.view')
  findAll(@Query() query: QueryProjectDto) {
    return this.projectsService.findAll(query);
  }

  @Get('statistics')
  @RequirePermissions('projects.view')
  getAllStatistics() {
    return this.projectsService.getAllStatistics();
  }

  @Get(':id')
  @RequirePermissions('projects.view')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/statistics')
  @RequirePermissions('projects.view')
  getStatistics(@Param('id') id: string) {
    return this.projectsService.getStatistics(id);
  }

  @Get(':id/activity-logs')
  @RequirePermissions('projects.view')
  getActivityLogs(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.projectsService.getActivityLogs(id, limit);
  }

  @Post()
  @RequirePermissions('projects.create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: any,
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.remove(id, req.user.id);
  }

  @Post(':id/members')
  @RequirePermissions('projects.update')
  addMembers(
    @Param('id') id: string,
    @Body() manageMembersDto: ManageMembersDto,
    @Request() req: any,
  ) {
    return this.projectsService.addMembers(id, manageMembersDto.userIds, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions('projects.update')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.projectsService.removeMember(id, memberId, req.user.id);
  }

  @Post(':id/tags')
  @RequirePermissions('projects.update')
  addTags(
    @Param('id') id: string,
    @Body() manageTagsDto: ManageTagsDto,
    @Request() req: any,
  ) {
    return this.projectsService.addTags(id, manageTagsDto.tagIds, req.user.id);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('projects.update')
  @HttpCode(HttpStatus.OK)
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Request() req: any,
  ) {
    return this.projectsService.removeTag(id, tagId, req.user.id);
  }
}
