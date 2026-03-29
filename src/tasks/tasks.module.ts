import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [NotificationsModule, PrismaModule],
  providers: [TasksService],
  exports: [TasksService]
})
export class TasksModule {}
