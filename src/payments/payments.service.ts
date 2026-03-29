import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
    constructor(
        @Inject('PAYMENT_GATEWAY') private readonly paymentGateway: PaymentGateway,
        private prismaService: PrismaService,
        private notificationsService: NotificationsService,
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
    async createPayment(amount: number, email: string, description: string, schoolId: string, subscriptionId: string, dueDate: Date) {
        const user = await this.validateUser(email, schoolId);

        const newPayment = await this.prismaService.payment.create({
            data: {
                amount: amount,
                provider: this.paymentGateway.provider as any,
                status: 'PENDING',
                dueDate: dueDate,
                payer: { connect: { id: user.id } },
                school: { connect: { id: schoolId } },
                subscription: { connect: { id: subscriptionId } }
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
        }

        // --- ASEGURAR PAGOS PRE-GENERADOS ---
        // Verificamos cuántos pagos ya existen
        const existingPaymentsCount = await this.prismaService.payment.count({
            where: { subscriptionId: subscription.id }
        });

        // Si faltan pagos (ej: es nueva o el plan tiene 12 meses y no hay registros), los creamos
        if (existingPaymentsCount === 0) {
            const payments = Array.from({ length: plan.durationMonths || 1 }, (_, i) => {
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + i);

                return {
                    amount: plan.price,
                    currency: 'CLP',
                    provider: this.paymentGateway.provider as any,
                    status: 'PENDING' as any,
                    dueDate: dueDate,
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
        return this.prismaService.subscription.findMany({
            where: {
                schoolId,
                payer: { email }
            },
            include: {
                plan: true
            }
        });
    }



    async resendPaymentLink(paymentId: string) {
        const payment = await this.prismaService.payment.findUnique({
            where: { id: paymentId },
            include: {
                payer: true,
                school: true,
                subscription: { include: { student: true } }
            }
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        // Si el pago no tiene link (externalId de MP o similar), deberíamos generarlo.
        // Pero para simplificar, asumimos que usamos el payment.id para el link de respuesta.
        const paymentLink = `https://${payment.school.slug}.sportivo.com/pay/${payment.id}`;

        await this.notificationsService.sendManualLink(
            payment.payer.email,
            `${payment.subscription.student.firstName} ${payment.subscription.student.lastName}`,
            paymentLink
        );

        return { success: true, message: 'Link reenviado exitosamente' };
    }

    async cancelSubscription(subscriptionId: string, schoolId: string) {
        const subscription = await this.prismaService.subscription.findUnique({
            where: { id: subscriptionId, schoolId }
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        // Si la suscripción tiene un externalId de MercadoPago, la cancelamos allá
        if (subscription.externalId) {
            await this.paymentGateway.cancelSubscription(subscription.externalId);
        }

        // Actualizamos el estado local (CANCELLED)
        return await this.prismaService.subscription.update({
            where: { id: subscriptionId },
            data: { status: 'CANCELLED' }
        });
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
                    await this.processPaymentStatusUpdate(
                        paymentInfo.externalId,
                        paymentInfo.status,
                        dataId.toString()
                    );
                }
            }
            else if (type === 'subscription_preapproval') {
                const subscriptionInfo = await this.paymentGateway.getSubscriptionStatus(dataId);
                if (subscriptionInfo.externalId) {
                    await this.processSubscriptionStatusUpdate(
                        subscriptionInfo.externalId,
                        subscriptionInfo.status,
                        dataId.toString()
                    );
                }
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
        }
    }

    /**
     * Procesa la actualización de un pago puntual o recurrente.
     * @param externalId ID interno del pago (pago puntual) o de la suscripción (pago recurrente)
     * @param rawStatus Estado crudo proveniente de MercadoPago (ej: 'approved', 'rejected')
     * @param mpPaymentId ID de la transacción en MercadoPago
     */
    async processPaymentStatusUpdate(externalId: string, rawStatus: string, mpPaymentId: string) {
        const now = new Date();
        const mappedStatus = this.mapMercadoPagoStatus(rawStatus);

        console.log(
            'Processing Payment Update:',
            rawStatus,
            '→',
            mappedStatus,
            'externalRef:',
            externalId,
            'mpId:',
            mpPaymentId
        );

        const isApproved = mappedStatus === 'COMPLETED';

        // Caso 1: pago puntual — el externalId ES el id de nuestro Payment
        const existingPayment = await this.prismaService.payment.findUnique({
            where: { id: externalId }
        });

        if (existingPayment) {
            const updatedPayment = await this.prismaService.payment.update({
                where: { id: existingPayment.id },
                data: {
                    status: mappedStatus,
                    externalId: mpPaymentId,
                    paidAt: isApproved ? now : null,
                },
            });

            // Si el pago se aprueba y tiene suscripción, la activamos
            if (isApproved && existingPayment.subscriptionId) {
                await this.prismaService.subscription.update({
                    where: { id: existingPayment.subscriptionId },
                    data: { status: 'ACTIVE' }
                });
            }
            return updatedPayment;
        } else {
            // Caso 2: cobro recurrente — el externalId ES el subscriptionId
            // Buscamos el payment PENDING más antiguo de esa suscripción (el próximo a vencer)
            const pendingPayment = await this.prismaService.payment.findFirst({
                where: {
                    subscriptionId: externalId,
                    status: 'PENDING',
                },
                orderBy: { dueDate: 'asc' },
            });

            if (pendingPayment) {
                await this.prismaService.payment.update({
                    where: { id: pendingPayment.id },
                    data: {
                        status: mappedStatus,
                        externalId: mpPaymentId,
                        paidAt: isApproved ? now : null,
                    },
                });

                // Si el pago se aprueba, activamos la suscripción
                if (isApproved && pendingPayment.subscriptionId) {
                    await this.prismaService.subscription.update({
                        where: { id: pendingPayment.subscriptionId },
                        data: { status: 'ACTIVE' }
                    });
                }

                // Si el cobro falló, la suscripción queda en mora
                if (mappedStatus === 'FAILED' && pendingPayment.subscriptionId) {
                    await this.prismaService.subscription.update({
                        where: { id: pendingPayment.subscriptionId },
                        data: { status: 'PAST_DUE' }
                    });
                }
            }
        }
    }

    /**
     * Procesa la actualización de estado de una suscripción (alta/baja).
     */
    async processSubscriptionStatusUpdate(externalId: string, mpStatus: string, mpSubscriptionId: string) {
        console.log('Processing Subscription Update:', mpStatus, 'externalRef:', externalId);

        return await this.prismaService.subscription.update({
            where: { id: externalId },
            data: {
                status: mpStatus === 'authorized' ? 'ACTIVE' : 'CANCELLED',
                externalId: mpSubscriptionId,
            },
        });
    }

    /**
     * Helper para obtener IDs válidos para pruebas manuales.
     */
    async getDebugIds() {
        const plan = await this.prismaService.plan.findFirst();
        const school = await this.prismaService.school.findFirst();
        const user = await this.prismaService.user.findFirst({
            where: { email: 'test@mercadopago.com' }
        });
        
        return {
            planId: plan?.id,
            schoolId: school?.id,
            userId: user?.id,
            schoolSlug: school?.slug?.trim()
        };
    }

    private mapMercadoPagoStatus(status: string): 'COMPLETED' | 'PENDING' | 'FAILED' {
        switch (status) {
            case 'approved':
                return 'COMPLETED';

            case 'pending':
            case 'in_process':
                return 'PENDING';

            case 'rejected':
            case 'cancelled':
                return 'FAILED';

            default:
                return 'PENDING'; // fallback seguro
        }
    }
}