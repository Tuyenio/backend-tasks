import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import {
  UserInvitation,
  InvitationStatus,
} from '../../entities/user-invitation.entity';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  InviteUserDto,
  AcceptInviteDto,
} from './dto/auth.dto';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(UserInvitation)
    private invitationsRepository: Repository<UserInvitation>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private chatService: ChatService,
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
          'projects.create',
          'projects.update',
          'projects.delete',
          'projects.view',
          'tasks.create',
          'tasks.update',
          'tasks.delete',
          'tasks.view',
          'tasks.assign',
          'tasks.complete',
          'notes.create',
          'notes.update',
          'notes.delete',
          'notes.view',
          'chat.create',
          'chat.send',
          'chat.delete',
          'reports.view',
          'reports.export',
          'reports.create',
          'users.view',
          'users.manage',
          'users.invite',
          'roles.view',
          'roles.manage',
          'roles.create',
          'roles.delete',
          'settings.view',
          'settings.manage',
          'team.view',
          'team.manage',
        ];
      }

      // Add permissions from role
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((permission) =>
          permissionsSet.add(permission),
        );
      }
    }

    return Array.from(permissionsSet);
  }

  /**
   * Format user object for frontend
   */
  private formatUserResponse(user: User) {
    const {
      password,
      verificationToken,
      resetPasswordToken,
      resetPasswordExpires,
      ...userWithoutSensitiveData
    } = user;

    // Extract role names
    const roleNames = user.roles?.map((role) => role.name) || [];

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
      throw new ConflictException('Email đã được đăng ký');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default member role
    const memberRole = await this.rolesRepository.findOne({
      where: { name: 'member' },
    });

    if (!memberRole) {
      throw new NotFoundException('Vai trò mặc định không tìm thấy');
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

    // Queue chat creation asynchronously (don't await, avoid N² performance issue)
    this.chatService
      .ensureDirectChatsForUser(user.id)
      .catch((error) =>
        console.error(
          `Failed to create direct chats for user ${user.id}:`,
          error,
        ),
      );

    // Send verification email
    try {
      await this.emailService.sendEmailVerificationEmail(
        user.email,
        verificationToken,
        user.name,
      );
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    return {
      message:
        'Đăng ký thành công. Vui lòng kiểm tra email của bạn để xác thực tài khoản.',
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
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    // Check if user is locked
    if (user.isLocked) {
      throw new UnauthorizedException(
        'Tài khoản đã bị khóa. Vui lòng liên hệ với quản trị viên.',
      );
    }

    // Update last login and status
    user.lastLoginAt = new Date();
    user.status = UserStatus.ONLINE;
    await this.usersRepository.save(user);

    // Reload user with relations (important for formatting response)
    const updatedUser = await this.usersRepository.findOne({
      where: { id: user.id },
      relations: ['roles'],
    });

    if (!updatedUser) {
      throw new UnauthorizedException('Không thể tải thông tin người dùng');
    }

    // Generate JWT token
    const payload = { sub: updatedUser.id, email: updatedUser.email };
    const accessToken = this.jwtService.sign(payload);

    // Format user response with permissions
    const formattedUser = this.formatUserResponse(updatedUser);

    return {
      accessToken,
      user: formattedUser,
    };
  }

  /**
   * Validate Google OAuth user
   * If user exists with email, login
   * If not, create new user from Google profile
   */
  async validateGoogleUser(googleData: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
  }) {
    // Find user by email
    let user = await this.usersRepository.findOne({
      where: { email: googleData.email },
      relations: ['roles'],
    });

    if (user) {
      // User exists - just update last login
      user.lastLoginAt = new Date();
      user.status = UserStatus.ONLINE;
      await this.usersRepository.save(user);
      
      // Reload with relations to ensure we have roles for formatting
      user = await this.usersRepository.findOne({
        where: { id: user.id },
        relations: ['roles'],
      });

      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }
    } else {
      // Create new user from Google profile
      const memberRole = await this.rolesRepository.findOne({
        where: { name: 'member' },
      });

      if (!memberRole) {
        throw new NotFoundException('Vai trò thành viên không tìm thấy');
      }

      user = this.usersRepository.create({
        email: googleData.email,
        name: `${googleData.firstName} ${googleData.lastName}`,
        password: await bcrypt.hash(randomBytes(32).toString('hex'), 10), // Random password
        avatarUrl: googleData.picture,
        emailVerified: true, // Google email is already verified
        isActive: true,
        status: UserStatus.ONLINE,
        roles: [memberRole],
      });

      user = await this.usersRepository.save(user);

      // Reload with relations
      user = await this.usersRepository.findOne({
        where: { id: user.id },
        relations: ['roles'],
      });

      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng sau khi tạo');
      }

      // Queue chat creation asynchronously (don't await, avoid N² performance issue)
      const userId = user.id;
      this.chatService
        .ensureDirectChatsForUser(userId)
        .catch((error) =>
          console.error(
            `Failed to create direct chats for user ${userId}:`,
            error,
          ),
        );
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Format user response
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
        message: 'Nếu email tồn tại, một liên kết đặt lại sẽ được gửi',
      };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;

    await this.usersRepository.save(user);

    // Send reset password email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name,
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't reveal if email sending failed
    }

    return {
      message: 'Nếu email tồn tại, một liên kết đặt lại sẽ được gửi',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.usersRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user || !user.resetPasswordExpires) {
      throw new BadRequestException('Mã đặt lại không hợp lệ hoặc đã hết hạn');
    }

    // Check if token expired
    if (user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Mã đặt lại đã hết hạn');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.usersRepository.save(user);

    return {
      message: 'Đặt lại mật khẩu thành công',
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
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
      throw new BadRequestException('Mã xác thực không hợp lệ');
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
      throw new NotFoundException('Người dùng không tìm thấy');
    }

    // Check if user is locked
    if (user.isLocked) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    return this.formatUserResponse(user);
  }

  async refreshToken(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Người dùng không hợp lệ');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
    };
  }

  async inviteUser(inviteUserDto: InviteUserDto, inviterId: string) {
    const { email, roleIds } = inviteUserDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Người dùng với email này đã tồn tại');
    }

    // Check if there's a pending invitation
    const existingInvite = await this.invitationsRepository.findOne({
      where: { email, status: InvitationStatus.PENDING },
    });

    // If invite exists and not expired, resend the same token instead of creating new one
    if (existingInvite && existingInvite.expiresAt > new Date()) {
      // Resend invitation email with existing token
      try {
        const inviterForResend = await this.usersRepository.findOne({
          where: { id: inviterId },
        });
        if (!inviterForResend) {
          throw new NotFoundException('Không tìm thấy người mời');
        }

        // Get role names for existing invite
        const existingRoles = await this.rolesRepository.findByIds(
          existingInvite.roleIds,
        );
        const roleNames = existingRoles
          .map((r) => r.displayName || r.name)
          .join(', ');

        await this.emailService.sendUserInviteEmail(
          email,
          existingInvite.token,
          inviterForResend.name,
          roleNames,
        );

        return {
          message: 'Invitation resent successfully',
          invitation: {
            email,
            expiresAt: existingInvite.expiresAt,
            roles: existingRoles.map((r) => ({
              id: r.id,
              name: r.name,
              displayName: r.displayName,
            })),
          },
        };
      } catch (error) {
        this.logger.error('Failed to resend invitation email:', error);
        throw new ConflictException('Không thể gửi lại lời mời');
      }
    }

    // If invite exists but expired or accepted, delete it to allow new invite
    if (existingInvite) {
      await this.invitationsRepository.remove(existingInvite);
    }

    // Get inviter info
    const inviter = await this.usersRepository.findOne({
      where: { id: inviterId },
    });

    if (!inviter) {
      throw new NotFoundException('Người mời không tìm thấy');
    }

    // Validate roles
    let roles: Role[] = [];
    if (roleIds && roleIds.length > 0) {
      roles = await this.rolesRepository.findByIds(roleIds);
      if (roles.length !== roleIds.length) {
        throw new BadRequestException('Một số vai trò không tìm thấy');
      }
    } else {
      // Default to member role
      const memberRole = await this.rolesRepository.findOne({
        where: { name: 'member' },
      });
      if (memberRole) {
        roles = [memberRole];
      }
    }

    // Generate invite token (JWT with 7 days expiry)
    const inviteToken = this.jwtService.sign(
      { email, roleIds: roles.map((r) => r.id), type: 'invite' },
      { expiresIn: '7d' },
    );

    // Set expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = this.invitationsRepository.create({
      email,
      token: inviteToken,
      roleIds: roles.map((r) => r.id),
      invitedById: inviterId,
      expiresAt,
      status: InvitationStatus.PENDING,
    });

    await this.invitationsRepository.save(invitation);

    // Send invitation email
    try {
      const roleNames = roles.map((r) => r.displayName || r.name).join(', ');
      await this.emailService.sendUserInviteEmail(
        email,
        inviteToken,
        inviter.name,
        roleNames,
      );
    } catch (error) {
      this.logger.error('Failed to send invitation email:', error);
      // Don't fail the invitation if email fails
    }

    return {
      message: 'Invitation sent successfully',
      invitation: {
        email,
        expiresAt,
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })),
      },
    };
  }

  async verifyInviteToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'invite') {
        throw new BadRequestException('Loại mã không hợp lệ');
      }

      // Check invitation in database
      const invitation = await this.invitationsRepository.findOne({
        where: { token },
        relations: ['invitedBy'],
      });

      if (!invitation) {
        throw new NotFoundException('Lời mời không tìm thấy');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException('Lời mời đã được sử dụng hoặc bị hủy');
      }

      if (invitation.expiresAt < new Date()) {
        invitation.status = InvitationStatus.EXPIRED;
        await this.invitationsRepository.save(invitation);
        throw new BadRequestException('Lời mời đã hết hạn');
      }

      // Check if user already exists
      const existingUser = await this.usersRepository.findOne({
        where: { email: invitation.email },
      });

      if (existingUser) {
        throw new ConflictException('Người dùng đã tồn tại');
      }

      // Get role names
      const roles = await this.rolesRepository.findByIds(invitation.roleIds);

      return {
        email: invitation.email,
        inviterName: invitation.invitedBy?.name || 'Administrator',
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })),
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Token lời mời đã hết hạn');
      }
      throw error;
    }
  }

  async acceptInvite(acceptInviteDto: AcceptInviteDto) {
    const { token, password, name, phone } = acceptInviteDto;

    // Verify token and get invitation
    const inviteInfo = await this.verifyInviteToken(token);

    const invitation = await this.invitationsRepository.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Lời mời không tìm thấy');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get roles
    const roles = await this.rolesRepository.findByIds(invitation.roleIds);

    // Create user
    const user = this.usersRepository.create({
      email: inviteInfo.email,
      password: hashedPassword,
      name,
      phone,
      roles,
      emailVerified: true, // Auto-verify for invited users
      isActive: true,
    });

    await this.usersRepository.save(user);

    // Queue chat creation asynchronously (don't await, avoid N² performance issue)
    this.chatService
      .ensureDirectChatsForUser(user.id)
      .catch((error) =>
        console.error(
          `Failed to create direct chats for user ${user.id}:`,
          error,
        ),
      );

    // Mark invitation as accepted
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationsRepository.save(invitation);

    return {
      message: 'Account created successfully',
      user: this.formatUserResponse(user),
    };
  }

  private readonly logger = new Logger(AuthService.name);
}
