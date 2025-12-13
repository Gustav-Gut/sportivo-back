import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MercadoPagoService } from './mercadopago.service';

@Module({
  providers: [
    PaymentsService,
    {
      provide: 'PAYMENT_GATEWAY',
      useClass: MercadoPagoService,
    },
  ],
  controllers: [PaymentsController]
})
export class PaymentsModule { }
