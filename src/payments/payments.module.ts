import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MercadoPagoService } from './mercadopago.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [NotificationsModule, TasksModule, UsersModule],
  providers: [
    PaymentsService,
    MercadoPagoService,
    {
      provide: 'PAYMENT_GATEWAY',
      useClass: MercadoPagoService,
    },
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService]
})
export class PaymentsModule { }
