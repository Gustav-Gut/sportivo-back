import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig, { Preference, Payment, PreApproval } from 'mercadopago';
import { PaymentGateway } from './interfaces/payment-gateway.interface';

@Injectable()
export class MercadoPagoService implements PaymentGateway {
    private client: MercadoPagoConfig;

    constructor(private configService: ConfigService) {
        const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');

        if (!accessToken) {
            console.warn('MERCADOPAGO_ACCESS_TOKEN not set in .env');
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
                            id: 'sportivo-service',
                            title: description,
                            quantity: 1,
                            unit_price: amount,
                        },
                    ],
                    payer: {
                        email: email,
                    },
                    back_urls: {
                        success: 'https://www.google.com/success',
                        failure: 'https://www.google.com/failure',
                        pending: 'https://www.google.com/pending',
                    },
                    auto_return: 'approved',
                },
            });

            return response.init_point!; // init_point es el link de pago
        } catch (error) {
            console.error('Error creando preferencia MP:', error);
            throw new InternalServerErrorException('Could not create payment link');
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
                    back_url: 'https://www.google.com/success',
                    status: 'pending',
                },
            });
            return response.init_point!; // init_point es el link de pago
        } catch (error) {
            console.error('Error creando suscripción MP:', error);
            throw new InternalServerErrorException('Could not create subscription link');
        }
    }

    async searchSubscriptions(email?: string): Promise<any[]> {
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
            console.error('Error buscando suscripciones:', error);
            throw new InternalServerErrorException('Error searching subscriptions');
        }
    }

    async getPaymentStatus(id: string): Promise<string> {
        try {
            const payment = new Payment(this.client);
            const response = await payment.get({ id });
            return response.status!;
        } catch (error) {
            throw new InternalServerErrorException('Error fetching payment status');
        }
    }
}