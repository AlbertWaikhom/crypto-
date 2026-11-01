import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@navrix/types';

export const ROLES_KEY = 'navrix_roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

