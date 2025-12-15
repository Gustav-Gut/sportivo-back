import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';

import { PrismaService } from '../prisma/prisma.service';
import { Student } from '@prisma/client';

@Injectable()
export class PaymentsService {
    constructor(
        @Inject('PAYMENT_GATEWAY') private readonly paymentGateway: PaymentGateway,
        private prismaService: PrismaService,
    ) { }

    private async validateStudent(email: string): Promise<Student> {
        const student = await this.prismaService.student.findUnique({
            where: { email },
        });
        if (!student) {
            throw new NotFoundException(`Student with email ${email} not found`);
        }
        return student;
    }

    async createPayment(amount: number, email: string, description: string) {
        const student = await this.validateStudent(email);

        const newPayment = await this.prismaService.payment.create({
            data: {
                amount: amount,
                provider: 'mercadopago',
                status: 'PENDING',
                studentId: student.id,
            },
        });

        const link = await this.paymentGateway.createPaymentLink(
            amount,
            email,
            description,
            newPayment.id,
        );

        return { link, paymentId: newPayment.id };
    }

    async createSubscription(price: number, email: string, reason: string, frequency: number) {
        const student = await this.validateStudent(email);

        const subscription = await this.prismaService.subscription.upsert({
            where: { studentId: student.id },
            update: {
                planId: reason,
                status: 'PENDING',
                startDate: new Date(),
            },
            create: {
                studentId: student.id,
                planId: reason,
                status: 'PENDING',
            },
        });

        const link = await this.paymentGateway.createSubscription(
            price,
            email,
            reason,
            frequency,
            subscription.id,
        );

        return { link, subscriptionId: subscription.id };
    }

    async getSubscriptions(email?: string) {
        return this.paymentGateway.searchSubscriptions(email);
    }

    async handleWebhook(body: any) {
        // MercadoPago envía diferentes tipos de eventos. Nos interesa 'payment' o 'subscription_preapproval'
        const type = body.type || body.topic;
        const dataId = body.data?.id || body.data?.ID;
        if (!dataId) return;
        console.log(`Webhook received: Type=${type}, ID=${dataId}`);
        try {
            if (type === 'payment') {
                const paymentInfo = await this.paymentGateway.getPaymentStatus(dataId);

                if (paymentInfo.externalId) {
                    await this.prismaService.payment.update({
                        where: { id: paymentInfo.externalId },
                        data: {
                            status: paymentInfo.status === 'approved' ? 'COMPLETED' : 'FAILED',
                            providerId: dataId.toString(),
                        },
                    });
                }
            }
            else if (type === 'subscription_preapproval') {
                const subscriptionInfo = await this.paymentGateway.getSubscriptionStatus(dataId);
                if (subscriptionInfo.externalId) {
                    await this.prismaService.subscription.update({
                        where: { id: subscriptionInfo.externalId },
                        data: {
                            status: subscriptionInfo.status === 'authorized' ? 'ACTIVE' : 'CANCELLED',
                            providerId: dataId.toString(),
                        },
                    });
                }
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
        }
    }
}