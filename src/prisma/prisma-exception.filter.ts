import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const message = exception.message.replace(/\n/g, '');

        switch (exception.code) {
            case 'P2002': {
                const status = HttpStatus.CONFLICT;
                response.status(status).json({
                    statusCode: status,
                    message: `Unique data of student is duplicated with other`,
                });
                break;
            }
            case 'P2025': {
                const status = HttpStatus.NOT_FOUND;
                response.status(status).json({
                    statusCode: status,
                    message: `Record not found`,
                });
                break;
            }
            default:
                // Default 500 error code
                console.error(exception);
                response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: message,
                });
                break;
        }
    }
}