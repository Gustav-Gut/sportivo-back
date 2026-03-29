import { Injectable } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
    constructor(
        private prismaService: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    // Corre todos los días a las 8 AM
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handleCron() {
        console.log('--- INICIO DE TAREAS AUTOMÁTICAS: ALERTAS DE PAGO ---');
        await this.checkUpcomingPayments();
        await this.checkOverduePayments();
        console.log('--- FIN DE TAREAS AUTOMÁTICAS ---');
    }

    private async checkUpcomingPayments() {
        const schools = await this.prismaService.school.findMany({
            where: { active: true }
        });

        for (const school of schools) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + school.preDueAlertDays);
            targetDate.setHours(0, 0, 0, 0);

            const upcomingPayments = await this.prismaService.payment.findMany({
                where: {
                    schoolId: school.id,
                    status: 'PENDING',
                    dueDate: {
                        gte: targetDate,
                        lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
                    },
                    lastAlertSentAt: null // Solo enviar una vez
                },
                include: {
                    payer: true,
                    subscription: { include: { student: true } }
                }
            });

            for (const payment of upcomingPayments) {
                await this.notificationsService.sendPreDueAlert(
                    payment.payer.email,
                    `${payment.subscription.student.firstName} ${payment.subscription.student.lastName}`,
                    payment.amount,
                    payment.dueDate!,
                    `https://${school.slug}.sportivo.com/pay/${payment.id}` // Link ejemplo
                );

                await this.prismaService.payment.update({
                    where: { id: payment.id },
                    data: { lastAlertSentAt: new Date() }
                });
            }
        }
    }

    private async checkOverduePayments() {
        const schools = await this.prismaService.school.findMany({
            where: { active: true }
        });

        for (const school of schools) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - school.moraAlertDays);
            targetDate.setHours(0, 0, 0, 0);

            const overduePayments = await this.prismaService.payment.findMany({
                where: {
                    schoolId: school.id,
                    status: 'PENDING',
                    dueDate: {
                        lte: targetDate
                    },
                    OR: [
                        { lastAlertSentAt: null },
                        { lastAlertSentAt: { lt: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000) } }
                    ]
                },
                include: {
                    payer: true,
                    subscription: { include: { student: true } }
                }
            });
            
            // Buscar administrador de la escuela
            const admins = await this.prismaService.user.findMany({
                where: {
                    schoolId: school.id,
                    roles: { has: 'ADMIN' }
                }
            });

            for (const payment of overduePayments) {
                const studentName = `${payment.subscription.student.firstName} ${payment.subscription.student.lastName}`;
                const daysOverdue = Math.floor((new Date().getTime() - payment.dueDate!.getTime()) / (24 * 60 * 60 * 1000));

                for (const admin of admins) {
                    await this.notificationsService.sendMoraAlert(
                        admin.email,
                        studentName,
                        payment.amount,
                        daysOverdue
                    );
                }

                await this.prismaService.payment.update({
                    where: { id: payment.id },
                    data: { lastAlertSentAt: new Date() }
                });
            }
        }
    }
}
