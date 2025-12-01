import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      return false;
    }

    // Super admin has all permissions
    const isSuperAdmin = user.roles?.some(role => role.name === 'super_admin');
    if (isSuperAdmin) {
      return true;
    }

    // Aggregate permissions from all roles
    const userPermissions = this.aggregateUserPermissions(user);

    // Check if user has all required permissions
    return requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    );
  }

  private aggregateUserPermissions(user: User): string[] {
    const permissionsSet = new Set<string>();

    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach(role => {
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach(permission => permissionsSet.add(permission));
        }
      });
    }

    return Array.from(permissionsSet);
  }
}
