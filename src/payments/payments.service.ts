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

    private async validateStudent(email: string, schoolId: string): Promise<Student> {
        const student = await this.prismaService.student.findFirst({
            where: {
                email,
                schoolId,
                active: true
            },
        });
        if (!student) {
            throw new NotFoundException(`Student with email ${email} not found`);
        }
        return student;
    }

    async createPayment(amount: number, email: string, description: string, schoolId: string) {
        const student = await this.validateStudent(email, schoolId);

        const newPayment = await this.prismaService.payment.create({
            data: {
                amount: amount,
                provider: this.paymentGateway.provider,
                status: 'PENDING',
                studentId: student.id,
                schoolId: schoolId
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

    async createSubscription(price: number, email: string, reason: string, frequency: number, schoolId: string) {
        const student = await this.validateStudent(email, schoolId);

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
                provider: this.paymentGateway.provider,
                status: 'PENDING',
                schoolId: schoolId
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

    async getSubscriptions(email: string, schoolId: string) {
        return this.paymentGateway.searchSubscriptions(email, schoolId);
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
                            externalId: dataId.toString(),
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
                            externalId: dataId.toString(),
                        },
                    });
                }
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
        }
    }
}