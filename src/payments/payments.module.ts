import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MercadoPagoService } from './mercadopago.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [NotificationsModule, TasksModule],
  providers: [
    PaymentsService,
    MercadoPagoService,
    {
      provide: 'PAYMENT_GATEWAY',
      useClass: MercadoPagoService,
    },
  ],
  controllers: [PaymentsController]
})
export class PaymentsModule { }
