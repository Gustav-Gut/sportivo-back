import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class PaymentsService {
    constructor(
        @Inject('PAYMENT_GATEWAY') private readonly paymentGateway: PaymentGateway,
        private prismaService: PrismaService,
    ) { }

    private async validateUser(email: string, schoolId: string): Promise<User> {
        const user = await this.prismaService.user.findFirst({
            where: {
                email,
                schoolId,
                active: true
            },
        });
        if (!user) {
            throw new NotFoundException(`User with email ${email} not found`);
        }
        return user;
    }

    /**
     * Genera un pago puntual (no suscripción) con su link de pago.
     */
    async createPayment(amount: number, email: string, description: string, schoolId: string, subscriptionId?: string, dueDate?: Date) {
        const user = await this.validateUser(email, schoolId);

        const newPayment = await this.prismaService.payment.create({
            data: {
                amount: amount,
                provider: this.paymentGateway.provider as any,
                status: 'PENDING',
                dueDate: dueDate || null,
                payer: { connect: { id: user.id } },
                school: { connect: { id: schoolId } },
                ...(subscriptionId && { subscription: { connect: { id: subscriptionId } } })
            } as any,
        });

        const link = await this.paymentGateway.createPaymentLink(
            amount,
            email,
            description,
            newPayment.id,
        );

        return { link, paymentId: newPayment.id };
    }

    /**
     * Crea una suscripción y pre-genera todos los pagos del plan con su fecha de vencimiento.
     * Ejemplo: Plan de 6 meses → 6 Payment con status PENDING y dueDate mensual.
     */
    async createSubscription(planId: string, email: string, schoolId: string, studentId?: string) {
        const payer = await this.validateUser(email, schoolId);

        // Obtener el plan para saber duración y precio
        const plan = await this.prismaService.plan.findFirst({
            where: { id: planId, schoolId, active: true }
        });
        if (!plan) {
            throw new NotFoundException(`Plan ${planId} not found or inactive`);
        }

        // Si no se provee studentId, el pagador es el estudiante (adulto)
        const targetStudentId = studentId || payer.id;

        // Verificar si ya hay una suscripción activa o pendiente para este estudiante y plan
        let subscription = await this.prismaService.subscription.findFirst({
            where: { studentId: targetStudentId, planId, status: { in: ['PENDING', 'ACTIVE'] } }
        });

        const startDate = new Date();

        if (subscription) {
            // Ya existe: solo actualizamos el pagador si cambió
            subscription = await this.prismaService.subscription.update({
                where: { id: subscription.id },
                data: { payerId: payer.id }
            });
        } else {
            // Creamos la suscripción nueva
            subscription = await this.prismaService.subscription.create({
                data: {
                    studentId: targetStudentId,
                    payerId: payer.id,
                    planId: plan.id,
                    provider: this.paymentGateway.provider as any,
                    status: 'PENDING',
                    schoolId: schoolId,
                    startDate: startDate,
                }
            });

            // Pre-generar los N pagos del plan (uno por mes)
            const payments = Array.from({ length: plan.durationMonths }, (_, i) => {
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + i);

                return {
                    amount: plan.price,
                    currency: 'CLP',
                    provider: this.paymentGateway.provider as any,
                    status: 'PENDING' as any,
                    dueDate,
                    paidAt: null,
                    subscriptionId: subscription!.id,
                    payerId: payer.id,
                    schoolId: schoolId,
                };
            });

            await this.prismaService.payment.createMany({ data: payments });
        }

        // Generar el link de suscripción en la pasarela de pago
        const link = await this.paymentGateway.createSubscription(
            plan.price,
            email,
            plan.name,
            1, // frecuencia mensual
            subscription.id,
        );

        return { link, subscriptionId: subscription.id };
    }

    async getSubscriptions(email: string, schoolId: string) {
        return this.paymentGateway.searchSubscriptions(email, schoolId);
    }

    /**
     * Obtiene el calendario de pagos de una suscripción con estado calculado.
     * Retorna cada cuota ordenada con su número de cuota e indicador de vencimiento.
     */
    async getPaymentSchedule(subscriptionId: string) {
        const payments = await this.prismaService.payment.findMany({
            where: { subscriptionId },
            orderBy: { dueDate: 'asc' },
            select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                dueDate: true,
                paidAt: true,
                createdAt: true,
            }
        });

        const now = new Date();
        return payments.map((p, i) => ({
            ...p,
            installment: i + 1,
            isOverdue: p.status === 'PENDING' && p.dueDate !== null && p.dueDate < now,
        }));
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
                    const now = new Date();
                    const isApproved = paymentInfo.status === 'approved';

                    // Caso 1: pago puntual — el externalId ES el id de nuestro Payment
                    const existingPayment = await this.prismaService.payment.findUnique({
                        where: { id: paymentInfo.externalId }
                    });

                    if (existingPayment) {
                        await this.prismaService.payment.update({
                            where: { id: existingPayment.id },
                            data: {
                                status: isApproved ? 'COMPLETED' : 'FAILED',
                                externalId: dataId.toString(),
                                paidAt: isApproved ? now : null,
                            },
                        });
                    } else {
                        // Caso 2: cobro recurrente — el externalId ES el subscriptionId
                        // Buscamos el payment PENDING más antiguo de esa suscripción (el próximo a vencer)
                        const pendingPayment = await this.prismaService.payment.findFirst({
                            where: {
                                subscriptionId: paymentInfo.externalId,
                                status: 'PENDING',
                            },
                            orderBy: { dueDate: 'asc' },
                        });

                        if (pendingPayment) {
                            await this.prismaService.payment.update({
                                where: { id: pendingPayment.id },
                                data: {
                                    status: isApproved ? 'COMPLETED' : 'FAILED',
                                    externalId: dataId.toString(),
                                    paidAt: isApproved ? now : null,
                                },
                            });

                            // Si el cobro falló, la suscripción queda en mora
                            if (!isApproved) {
                                await this.prismaService.subscription.update({
                                    where: { id: pendingPayment.subscriptionId },
                                    data: { status: 'PAST_DUE' }
                                });
                            }
                        }
                    }
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