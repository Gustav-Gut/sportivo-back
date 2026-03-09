import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';

export const CurrentSchoolId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new UnauthorizedException('User not authenticated');
        }

        // Si es SUPERADMIN y manda el header 'x-school-id', se lo permitimos para que pueda
        // operar en nombre de otra escuela. Si no lo manda, usamos el schoolId de su JWT.
        if (user.roles && user.roles.includes(Role.SUPERADMIN)) {
            const simulatedSchoolId = request.headers['x-school-id'];
            if (simulatedSchoolId) {
                return simulatedSchoolId;
            }
        }

        // Para cualquier otro rol (ADMIN, COACH, TUTOR, STUDENT), el 'x-school-id' 
        // será SIEMPRE el schoolId verificado criptográficamente en su JWT.
        // Esto previene Injecciones (que un coach de la escuela A envíe el id de la B).
        return user.schoolId;
    },
);
