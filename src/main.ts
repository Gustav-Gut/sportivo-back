import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma/prisma-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    app.useGlobalFilters(new PrismaClientExceptionFilter());

    // Configuración de Swagger
    const config = new DocumentBuilder()
      .setTitle('Sportivo API')
      .setDescription('Documentación de la API de Sportivo - Gestión Deportiva Enterprise')
      .setVersion('1.0')
      .addBearerAuth() // Soporte para JWT
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const frontendUrls = configService.get<string>('FRONTEND_URLS');
    const allowedOrigins = frontendUrls
      ? frontendUrls.split(',').map(url => url.trim())
      : ['http://localhost:4200'];

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });

    const port = configService.get<number>('PORT') || 3000;

    console.log(`Application is running on port: ${port}`); ``
    console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  } catch (error) {
    console.error('Error starting the application:', error);
    process.exit(1);
  }
}
bootstrap();
