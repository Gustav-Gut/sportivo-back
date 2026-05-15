import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma/prisma-exception.filter';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.use(cookieParser());
    app.setGlobalPrefix('');

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    app.useGlobalFilters(
      new GlobalExceptionFilter(),
      new PrismaClientExceptionFilter(),
    );
    app.useGlobalInterceptors(new LoggingInterceptor());

    // Configuración de Swagger
    const config = new DocumentBuilder()
      .setTitle('Clubit API')
      .setDescription('Documentación de la API de Clubit - Gestión Deportiva Enterprise')
      .setVersion('1.0')
      .addBearerAuth() // Soporte para JWT
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const frontendUrls = configService.get<string>('FRONTEND_URLS');
    const allowedOrigins = frontendUrls
      ? frontendUrls.split(',').map(url => url.trim())
      : ['http://localhost:4200'];

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });

    const port = configService.get<number>('PORT') || 3000;

    await app.listen(port, '0.0.0.0');

    console.log(`Application is running on port: ${port}`);
    console.log(`Swagger documentation available at: http://localhost:${port}/docs`);
  } catch (error) {
    console.error('Error starting the application:', error);
    process.exit(1);
  }
}
bootstrap();
