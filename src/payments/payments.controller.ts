import { Body, Controller, Post, Get, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('create-link')
    createLink(@Body() createPaymentDto: CreatePaymentDto) {
        return this.paymentsService.createPayment(
            createPaymentDto.amount,
            createPaymentDto.email,
            createPaymentDto.description,
        );
    }

    @Post('create-subscription')
    createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto) {
        return this.paymentsService.createSubscription(
            createSubscriptionDto.price,
            createSubscriptionDto.email,
            createSubscriptionDto.reason,
            createSubscriptionDto.frequency,
        );
    }

    @Get('subscriptions')
    getSubscriptions(@Query('email') email?: string) {
        return this.paymentsService.getSubscriptions(email);
    }

    @Post('webhook')
    async handleWebhook(@Body() body: any) {
        // Respondemos 200 OK rápido a MercadoPago para que sepa que recibimos el mensaje
        // El procesamiento lo hacemos asíncrono (sin await) o síncrono si es rápido.
        await this.paymentsService.handleWebhook(body);
        return { status: 'OK' };
    }
}