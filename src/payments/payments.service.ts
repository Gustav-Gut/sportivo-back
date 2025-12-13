import { Inject, Injectable } from '@nestjs/common';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentsService {
    constructor(
        @Inject('PAYMENT_GATEWAY') private readonly paymentGateway: PaymentGateway,
    ) { }

    async createPayment(amount: number, email: string, description: string) {
        return this.paymentGateway.createPaymentLink(amount, email, description);
    }
}