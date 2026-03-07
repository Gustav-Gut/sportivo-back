import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();

        // Permitir acceso a la documentación de Swagger
        if (request.url.includes('/api/docs')) {
            return true;
        }

        const apiKey = request.headers['x-internal-api-key'];
        const validApiKey = this.configService.getOrThrow<string>('INTERNAL_API_KEY');

        if (apiKey !== validApiKey) {
            throw new UnauthorizedException('Invalid Internal API Key');
        }

        return true;
    }
}