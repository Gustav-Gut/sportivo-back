import { Body, Controller, Post, Get, Query, Param, UnauthorizedException, Headers, Inject } from '@nestjs/common';
import { CurrentSchoolId } from '../auth/decorators/current-school-id.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { MercadoPagoService } from './mercadopago.service';
import { TasksService } from '../tasks/tasks.service';

@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        @Inject('PAYMENT_GATEWAY') private readonly mercadoPagoService: MercadoPagoService,
        private readonly tasksService: TasksService,
    ) { }

    @Public()
    @Post('trigger-alerts')
    async triggerAlerts() {
        return await this.tasksService.handleCron();
    }

    @Post('create-link')
    createLink(
        @Body() createPaymentDto: CreatePaymentDto,
        @CurrentSchoolId() schoolId: string
    ) {
        return this.paymentsService.createPayment(
            createPaymentDto.amount,
            createPaymentDto.email,
            createPaymentDto.description,
            schoolId,
            createPaymentDto.subscriptionId,
            new Date(createPaymentDto.dueDate)
        );
    }

    @Post('create-subscription')
    createSubscription(
        @Body() createSubscriptionDto: CreateSubscriptionDto,
        @CurrentSchoolId() schoolId: string
    ) {
        return this.paymentsService.createSubscription(
            createSubscriptionDto.planId,
            createSubscriptionDto.email,
            schoolId,
            createSubscriptionDto.studentId,
        );
    }

    @Get('subscriptions')
    getSubscriptions(
        @Query('email') email: string,
        @CurrentSchoolId() schoolId: string
    ) {
        return this.paymentsService.getSubscriptions(email, schoolId);
    }

    @Get('schedule/:subscriptionId')
    getPaymentSchedule(
        @Param('subscriptionId') subscriptionId: string,
    ) {
        return this.paymentsService.getPaymentSchedule(subscriptionId);
    }

    @Post('cancel-subscription/:id')
    cancelSubscription(
        @Param('id') id: string,
        @CurrentSchoolId() schoolId: string
    ) {
        return this.paymentsService.cancelSubscription(id, schoolId);
    }

    @Post('resend-link/:id')
    resendLink(
        @Param('id') id: string,
    ) {
        return this.paymentsService.resendPaymentLink(id);
    }

    @Public()
    @Post('webhook')
    async handleWebhook(
        @Body() body: any,
        @Headers('x-signature') xSignature: string = '',
        @Headers('x-request-id') xRequestId: string = '',
    ) {
        const dataId = body?.data?.id?.toString() || '';

        // Validar firma HMAC de MercadoPago (se omite si no hay MERCADOPAGO_WEBHOOK_SECRET en .env)
        const isValid = this.mercadoPagoService.validateWebhookSignature(xSignature, xRequestId, dataId);
        if (!isValid) {
            throw new UnauthorizedException('Invalid webhook signature');
        }

        await this.paymentsService.handleWebhook(body);
        return { status: 'OK' };
    }

    /**
     * ENDPOINT DE PRUEBA: Permite simular un webhook sin llamar a la API de MercadoPago.
     */
    @Public()
    @Post('test-webhook')
    async handleTestWebhook(@Body() body: any) {
        const { externalId, status, mpId, type, command } = body;
        
        if (command === 'get-ids') {
             return this.paymentsService.getDebugIds();
        }

        if (type === 'subscription') {
            return await this.paymentsService.processSubscriptionStatusUpdate(externalId, status, mpId || 'TEST_SUB_123');
        }
        return await this.paymentsService.processPaymentStatusUpdate(externalId, status, mpId || 'TEST_PAY_123');
    }
}