import type { Request } from 'express';
import type { Role } from '../../entities/role.entity';

export interface AuthUserPayload {
  id: string;
  email?: string;
  name?: string;
  isActive?: boolean;
  isLocked?: boolean;
  roles?: Array<Pick<Role, 'id' | 'name' | 'displayName' | 'permissions'>>;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthUserPayload;
}

export interface GoogleAuthRequest extends Request {
  user: {
    accessToken: string;
    user: AuthUserPayload;
  };
}
