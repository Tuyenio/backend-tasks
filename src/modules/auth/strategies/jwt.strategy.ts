import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import type { Role } from '../../../entities/role.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('Biến môi trường JWT_SECRET chưa được cấu hình');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: ['roles'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Người dùng không tìm thấy hoặc vô hiệu hóa',
      );
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // Ensure roles are loaded with permissions (simple-array is auto-loaded)
    // This is needed for PermissionsGuard to work properly
    const userRoles = Array.isArray(user.roles) ? (user.roles as Role[]) : [];
    this.logger.debug(
      `JWT validated for user ${user.email} with roles: ${userRoles
        .map((r) => r.name)
        .join(', ')}`,
    );
    return { ...user, roles: userRoles };
  }
}
