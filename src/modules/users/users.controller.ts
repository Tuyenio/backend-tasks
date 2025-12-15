import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('statistics')
  @RequirePermissions('users.view')
  getStatistics() {
    return this.usersService.getStatistics();
  }

  @Get('me')
  async getMe(@Request() req) {
    const user = await this.usersService.findOne(req.user.id);
    const { password, ...result } = user;
    return result;
  }

  @Patch('me')
  async updateMe(
    @Request() req,
    @Body()
    updateData: {
      name?: string;
      phone?: string;
      bio?: string;
      department?: string;
      jobRole?: string;
    },
  ) {
    const user = await this.usersService.updateProfile(req.user.id, updateData);
    const { password, ...result } = user;
    return result;
  }

  @Patch('me/avatar')
  async updateMyAvatar(@Request() req, @Body('avatarUrl') avatarUrl: string) {
    const user = await this.usersService.updateAvatar(req.user.id, avatarUrl);
    const { password, ...result } = user;
    return result;
  }

  @Get('me/settings')
  getMySettings(@Request() req) {
    return this.usersService.getUserSettings(req.user.id);
  }

  @Patch('me/settings')
  updateMySettings(@Request() req, @Body() settings: any) {
    return this.usersService.updateUserSettings(req.user.id, settings);
  }

  @Get(':id')
  @RequirePermissions('users.view')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    const { password, ...result } = user;
    return result;
  }

  @Post()
  @RequirePermissions('users.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password, ...result } = user;
    return result;
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    const { password, ...result } = user;
    return result;
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/roles')
  @RequirePermissions('users.manage')
  async assignRoles(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    const user = await this.usersService.assignRoles(id, assignRoleDto.roleIds);
    const { password, ...result } = user;
    return result;
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('users.manage')
  @HttpCode(HttpStatus.OK)
  async removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    const user = await this.usersService.removeRole(id, roleId);
    const { password, ...result } = user;
    return result;
  }

  @Patch(':id/status')
  @RequirePermissions('users.manage')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    const user = await this.usersService.updateStatus(id, status);
    const { password, ...result } = user;
    return result;
  }

  @Patch(':id/toggle-active')
  @RequirePermissions('users.manage')
  async toggleActive(@Param('id') id: string) {
    const user = await this.usersService.toggleActive(id);
    const { password, ...result } = user;
    return result;
  }
}
