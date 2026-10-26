import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type Rol = 'admin' | 'duenio' | 'comprador';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
