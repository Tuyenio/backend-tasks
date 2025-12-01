import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private jwtService: JwtService,
  ) {}

  /**
   * Aggregate all permissions from user's roles
   * Super admin gets all permissions automatically
   */
  private aggregatePermissions(roles: Role[]): string[] {
    const permissionsSet = new Set<string>();

    for (const role of roles) {
      // Super admin has all permissions
      if (role.name === 'super_admin') {
        return [
          'projects.create', 'projects.update', 'projects.delete', 'projects.view',
          'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.view', 'tasks.assign', 'tasks.complete',
          'notes.create', 'notes.update', 'notes.delete', 'notes.view',
          'chat.create', 'chat.send', 'chat.delete',
          'reports.view', 'reports.export', 'reports.create',
          'users.view', 'users.manage', 'users.invite',
          'roles.view', 'roles.manage', 'roles.create', 'roles.delete',
          'settings.view', 'settings.manage',
          'team.view', 'team.manage',
        ];
      }

      // Add permissions from role
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(permission => permissionsSet.add(permission));
      }
    }

    return Array.from(permissionsSet);
  }

  /**
   * Format user object for frontend
   */
  private formatUserResponse(user: User) {
    const { password, verificationToken, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitiveData } = user;

    // Extract role names
    const roleNames = user.roles?.map(role => role.name) || [];

    // Aggregate permissions
    const permissions = this.aggregatePermissions(user.roles || []);

    return {
      ...userWithoutSensitiveData,
      roles: roleNames,
      permissions,
      avatarUrl: user.avatarUrl || null,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, phone } = registerDto;

    // Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default member role
    const memberRole = await this.rolesRepository.findOne({
      where: { name: 'member' },
    });

    if (!memberRole) {
      throw new NotFoundException('Default role not found');
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');

    // Create user
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
      roles: [memberRole],
      verificationToken,
      emailVerified: false,
    });

    await this.usersRepository.save(user);

    // TODO: Send verification email

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      user: this.formatUserResponse(user),
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with roles
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if user is locked
    if (user.isLocked) {
      throw new UnauthorizedException('Account has been locked. Please contact administrator.');
    }

    // Update last login and status
    user.lastLoginAt = new Date();
    user.status = UserStatus.ONLINE;
    await this.usersRepository.save(user);

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Format user response with permissions
    const formattedUser = this.formatUserResponse(user);

    return {
      accessToken,
      user: formattedUser,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return {
        message: 'If the email exists, a reset link has been sent',
      };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;

    await this.usersRepository.save(user);

    // TODO: Send reset password email

    return {
      message: 'If the email exists, a reset link has been sent',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.usersRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user || !user.resetPasswordExpires) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token expired
    if (user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.usersRepository.save(user);

    return {
      message: 'Password reset successful',
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await this.usersRepository.save(user);

    return {
      message: 'Password changed successfully',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.emailVerified = true;
    user.verificationToken = null;

    await this.usersRepository.save(user);

    return {
      message: 'Email verified successfully',
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is locked
    if (user.isLocked) {
      throw new UnauthorizedException('Account has been locked');
    }

    return this.formatUserResponse(user);
  }

  async refreshToken(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
    };
  }
}
