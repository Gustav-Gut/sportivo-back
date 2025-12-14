import { Body, Controller, Post } from '@nestjs/common';
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
}