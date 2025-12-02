import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthTestController {
  @Get('test-jwt')
  @UseGuards(JwtAuthGuard)
  async testJwt(@Request() req) {
    const user = req.user;
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        isLocked: user.isLocked,
        roles: user.roles?.map(r => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
          permissions: r.permissions,
        })),
      },
      message: 'JWT token is valid and contains roles',
    };
  }
}
