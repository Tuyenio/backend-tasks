import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
      throw new UnauthorizedException('Người dùng không tìm thấy hoặc vô hiệu hóa');
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // DEBUG: Log user roles and permissions
    console.log('🔍 JWT Validate - User:', user.email);
    console.log(
      '🔍 JWT Validate - Roles:',
      user.roles?.map((r) => ({ name: r.name, permissions: r.permissions })),
    );

    // Ensure roles are loaded with permissions (simple-array is auto-loaded)
    // This is needed for PermissionsGuard to work properly
    return user;
  }
}
