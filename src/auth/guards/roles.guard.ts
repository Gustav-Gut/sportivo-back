import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        if (request.url.includes('/api/docs')) {
            return true;
        }

        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const user = request.user;

        if (!user || !user.roles) {
            throw new ForbiddenException('No valid roles found');
        }

        if (user.roles.includes(Role.SUPERADMIN)) return true;

        const hasRole = requiredRoles.some((role) => user.roles.includes(role));

        if (!hasRole) {
            throw new ForbiddenException('Don\'t have permission for this action');
        }

        return true;
    }
}