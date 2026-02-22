import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma/prisma-exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new PrismaClientExceptionFilter());

    const port = process.env.PORT || 3000;
    // Render necesita escuchar en 0.0.0.0, no en localhost
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on port: ${port}`);
  } catch (error) {
    console.error('Error starting the application:', error);
    process.exit(1);
  }
}
bootstrap();
