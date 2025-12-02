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

    // DEBUG: Log permission check
    console.log('🔒 PermissionsGuard - Checking permissions');
    console.log('🔒 User:', user.email);
    console.log('🔒 User Roles:', user.roles?.map(r => ({ name: r.name, permissions: r.permissions })));
    console.log('🔒 Required Permissions:', requiredPermissions);

    // Super admin has all permissions
    const isSuperAdmin = user.roles?.some(role => role.name === 'super_admin');
    if (isSuperAdmin) {
      console.log('✅ Super admin bypass granted');
      return true;
    }

    // Aggregate permissions from all roles
    const userPermissions = this.aggregateUserPermissions(user);
    console.log('🔒 User Permissions:', userPermissions);

    // Check if user has all required permissions
    const hasPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    );
    console.log('🔒 Has Permissions:', hasPermissions);

    return hasPermissions;
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
