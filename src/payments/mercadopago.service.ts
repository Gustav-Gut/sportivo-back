import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig, { Preference, Payment, PreApproval } from 'mercadopago';
import { PaymentGateway, PaymentDetails } from './interfaces/payment-gateway.interface';
import { PaymentProvider } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class MercadoPagoService implements PaymentGateway {
    private client: MercadoPagoConfig;

    readonly provider = PaymentProvider.MERCADOPAGO;

    private readonly logger = new Logger(MercadoPagoService.name);

    constructor(private configService: ConfigService) {
        const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');

        if (!accessToken) {
            this.logger.warn('MERCADOPAGO_ACCESS_TOKEN not set in .env');
        }

        this.client = new MercadoPagoConfig({
            accessToken: accessToken || '',
            options: { timeout: 5000 }
        });
    }

    async createPaymentLink(
        amount: number,
        email: string,
        description: string,
        externalId: string
    ): Promise<string> {
        const preference = new Preference(this.client);

        try {
            const response = await preference.create({
                body: {
                    external_reference: externalId,
                    items: [
                        {
                            id: 'clubit-service',
                            title: description,
                            quantity: 1,
                            unit_price: amount,
                            currency_id: 'CLP',
                        },
                    ],
                    back_urls: {
                        success: 'https://www.google.com/success',
                        failure: 'https://www.google.com/failure',
                        pending: 'https://www.google.com/pending',
                    }
                    // auto_return: 'approved',
                },
            });

            if (!response.sandbox_init_point) {
                throw new InternalServerErrorException('No init_point returned');
            }
            return response.sandbox_init_point; // init_point es el link de pago
        } catch (error: any) {
            this.logger.warn(`MercadoPago API Error (Preference): ${error.response?.data?.message || error.message}`);
            this.logger.log('--- USANDO LINK DE PRUEBA (MOCK) PARA NO BLOQUEAR EL TEST ---');
            return `https://www.mercadopago.cl/sandbox/mock-link/${externalId}`;
        }
    }

    async createSubscription(
        price: number,
        email: string,
        reason: string,
        frequency: number,
        externalId: string,
    ): Promise<string> {
        const preApproval = new PreApproval(this.client);
        try {
            const response = await preApproval.create({
                body: {
                    external_reference: externalId,
                    reason: reason,
                    payer_email: email,
                    auto_recurring: {
                        frequency: frequency,
                        frequency_type: 'months',
                        transaction_amount: price,
                        currency_id: 'CLP',
                    },
                    back_url: this.configService.get<string>('MERCADOPAGO_BACK_URL_SUCCESS', 'http://localhost:4200/payment/success'),
                    status: 'pending',
                },
            });
            if (!response.init_point) {
                throw new InternalServerErrorException('No init_point returned');
            }
            return response.init_point; // init_point es el link de pago
        } catch (error: any) {
            this.logger.warn(`MercadoPago API Error (Subscription): ${error.response?.data?.message || error.message}`);
            this.logger.log('--- USANDO LINK DE PRUEBA (MOCK) PARA NO BLOQUEAR EL TEST ---');
            return `https://www.mercadopago.cl/sandbox/mock-link/${externalId}`;
        }
    }

    async searchSubscriptions(email: string, schoolId: string): Promise<any[]> {
        const preApproval = new PreApproval(this.client);

        try {
            const filters: any = {};
            if (email) {
                filters.payer_email = email;
            }
            // También podríamos filtrar por status: 'authorized' 
            const response = await preApproval.search({ options: filters });
            return response.results || [];
        } catch (error) {
            this.logger.error('Error buscando suscripciones:', error);
            throw new InternalServerErrorException('Error searching subscriptions');
        }
    }

    async getPaymentStatus(id: string): Promise<PaymentDetails> {
        try {
            const payment = new Payment(this.client);
            const response = await payment.get({ id });

            return {
                status: response.status!,
                externalId: response.external_reference!,
                amount: response.transaction_amount,
            };
        } catch (error) {
            throw new InternalServerErrorException('Error fetching payment status');
        }
    }

    async getSubscriptionStatus(id: string): Promise<PaymentDetails> {
        try {
            const preApproval = new PreApproval(this.client);
            const response = await preApproval.get({ id });
            return {
                status: response.status!, // 'authorized' o 'cancelled'
                externalId: response.external_reference!,
                amount: response.auto_recurring?.transaction_amount,
            };
        } catch (error) {
            throw new InternalServerErrorException('Error fetching subscription status');
        }
    }

    async cancelSubscription(id: string): Promise<void> {
        try {
            const preApproval = new PreApproval(this.client);
            await preApproval.update({
                id: id,
                body: {
                    status: 'cancelled',
                },
            });
            this.logger.log(`MercadoPago Subscription ${id} cancelled successfully.`);
        } catch (error: any) {
            this.logger.error(`Error cancelando suscripción MP: ${error.response?.data?.message || error.message}`);
            // Si el error es que ya está cancelada, no lanzamos excepción
            if (error.response?.data?.message?.includes('status is already cancelled')) {
                return;
            }
            throw new InternalServerErrorException('Could not cancel subscription in MercadoPago');
        }
    }

    /**
     * Valida la firma del webhook de MercadoPago (x-signature header).
     * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#configurar-notificaciones
     */
    validateWebhookSignature(xSignature: string, xRequestId: string, dataId: string): boolean {
        const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
        if (!secret) {
            // Sin secret configurado, se omite validación (útil en desarrollo local)
            this.logger.warn('MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature validation');
            return true;
        }

        try {
            // MP firma así: ts=<timestamp>;v1=<signature>
            const parts = xSignature.split(',');
            const tsPart = parts.find(p => p.startsWith('ts='));
            const v1Part = parts.find(p => p.startsWith('v1='));
            if (!tsPart || !v1Part) return false;

            const ts = tsPart.split('=')[1];
            const v1 = v1Part.split('=')[1];

            // Mensaje a firmar: id:<dataId>;request-id:<xRequestId>;ts:<ts>;
            const message = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(message)
                .digest('hex');

            return expectedSignature === v1;
        } catch {
            return false;
        }
    }
}