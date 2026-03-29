import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    async sendPreDueAlert(to: string, studentName: string, amount: number, dueDate: Date, paymentLink: string) {
        console.log(`[NOTIFICATION - PRE-DUE]`);
        console.log(`To: ${to}`);
        console.log(`Message: Hola, recordamos que la mensualidad de ${studentName} por $${amount} vence el ${dueDate.toLocaleDateString()}.`);
        console.log(`Paga aquí: ${paymentLink}`);
        console.log('-------------------------');
    }

    async sendMoraAlert(to: string, studentName: string, amount: number, daysOverdue: number) {
        console.log(`[NOTIFICATION - MORA]`);
        console.log(`To: ${to}`);
        console.log(`Message: ALERTA ADMINISTRADOR. El alumno ${studentName} tiene un pago pendiente de $${amount} con ${daysOverdue} días de retraso.`);
        console.log('-------------------------');
    }

    async sendManualLink(to: string, studentName: string, paymentLink: string) {
        console.log(`[NOTIFICATION - MANUAL RESEND]`);
        console.log(`To: ${to}`);
        console.log(`Message: Aquí tienes el link de pago solicitado para la mensualidad de ${studentName}.`);
        console.log(`Link: ${paymentLink}`);
        console.log('-------------------------');
    }
}
