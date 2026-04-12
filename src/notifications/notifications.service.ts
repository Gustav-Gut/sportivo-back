import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private resend: Resend;
    private from: string;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService
    ) {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        this.resend = new Resend(apiKey);
        this.from = this.configService.get<string>('MAIL_FROM') || 'Clubit <no-reply@mail.clubit.cl>';
    }

    private async getContent(schoolId: string, type: NotificationType, variables: Record<string, any>) {
        // Intentar buscar template personalizado
        const customTemplate = await this.prisma.notificationTemplate.findUnique({
            where: {
                schoolId_type_channel: {
                    schoolId,
                    type,
                    channel: NotificationChannel.EMAIL
                }
            }
        });

        if (customTemplate && customTemplate.active) {
            return {
                subject: this.compileTemplate(customTemplate.subject || '', variables),
                body: this.compileTemplate(customTemplate.body, variables)
            };
        }

        // Fallback a defaults
        return this.getDefaultTemplate(type, variables);
    }

    private compileTemplate(template: string, variables: Record<string, any>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    private getDefaultTemplate(type: NotificationType, variables: Record<string, any>) {
        const schoolName = variables.schoolName || 'Clubit';
        
        switch (type) {
            case NotificationType.PRE_DUE:
                return {
                    subject: `Recordatorio de pago: ${variables.studentName}`,
                    body: `
                        <h2 style="color: #1a202c; margin-top: 0;">Próximo Vencimiento</h2>
                        <p style="line-height: 1.6; font-size: 16px;">Hola,</p>
                        <p style="line-height: 1.6; font-size: 16px;">Te recordamos que la mensualidad de <strong>${variables.studentName}</strong> por un monto de <strong>$${variables.amount.toLocaleString('es-CL')}</strong> vence el próximo <strong>${variables.dueDate}</strong>.</p>
                        <div style="margin: 35px 0; text-align: center;">
                            <a href="${variables.paymentLink}" style="background-color: #0072FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Pagar Mensualidad</a>
                        </div>
                        <p style="line-height: 1.6; font-size: 14px; color: #666;">Si ya realizaste el pago, por favor ignora este mensaje.</p>
                    `
                };
            case NotificationType.MORA:
                return {
                    subject: `⚠️ MORA: ${variables.studentName} (${variables.daysOverdue} días)`,
                    body: `
                        <h2 style="color: #e53e3e; margin-top: 0;">Alerta de Pago Pendiente</h2>
                        <p style="line-height: 1.6; font-size: 16px;"><strong>ALERTA ADMINISTRADOR</strong></p>
                        <p style="line-height: 1.6; font-size: 16px;">El alumno <strong>${variables.studentName}</strong> tiene un pago pendiente por <strong>$${variables.amount.toLocaleString('es-CL')}</strong>.</p>
                        <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #c53030; font-weight: 600;">Días de retraso: ${variables.daysOverdue}</p>
                        </div>
                        <p style="line-height: 1.6; font-size: 15px;">Se recomienda contactar al apoderado para regularizar la situación.</p>
                    `
                };
            case NotificationType.MANUAL_LINK:
                return {
                    subject: `Link de pago solicitado: ${variables.studentName}`,
                    body: `
                        <h2 style="color: #1a202c; margin-top: 0;">Tu Link de Pago</h2>
                        <p style="line-height: 1.6; font-size: 16px;">Hola,</p>
                        <p style="line-height: 1.6; font-size: 16px;">Aquí tienes el link de pago solicitado para la mensualidad de <strong>${variables.studentName}</strong>.</p>
                        <div style="margin: 35px 0; text-align: center;">
                            <a href="${variables.paymentLink}" style="background-color: #0072FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Acceder al Pago</a>
                        </div>
                        <p style="line-height: 1.6; font-size: 14px; color: #666;">El link te redirigirá a nuestra plataforma de pago segura.</p>
                    `
                };
            default:
                return { subject: 'Notificación', body: '' };
        }
    }

    private getBaseTemplate(content: string, previewText: string, schoolName: string = 'Clubit') {
        return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificación ${schoolName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; color: #333;">
        <div style="display: none; max-height: 0px; overflow: hidden;">${previewText}</div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr>
                <td style="background: linear-gradient(135deg, #00C6FF 0%, #0072FF 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">${schoolName}</h1>
                </td>
            </tr>
            <!-- Content -->
            <tr>
                <td style="padding: 40px 30px;">
                    ${content}
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td style="padding: 30px; background-color: #fafbfc; border-top: 1px solid #eeeeee; text-align: center; color: #888888; font-size: 13px;">
                    <p style="margin: 0 0 10px 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${schoolName}. Todos los derechos reservados.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
    }

    async sendPreDueAlert(schoolId: string, to: string, studentName: string, amount: number, dueDate: Date, paymentLink: string, schoolName?: string) {
        const finalSchoolName = schoolName || (await this.prisma.school.findUnique({ where: { id: schoolId } }))?.name || 'Clubit';
        const dateFormatted = dueDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
        
        const variables = { studentName, amount, dueDate: dateFormatted, paymentLink, schoolName: finalSchoolName };
        const { subject, body } = await this.getContent(schoolId, NotificationType.PRE_DUE, variables);

        try {
            await this.resend.emails.send({
                from: this.from,
                to: [to],
                subject: subject,
                html: this.getBaseTemplate(body, `Tu pago de $${amount} vence el ${dateFormatted}`, finalSchoolName),
            });
            this.logger.log(`Pre-due alert sent to ${to} for school ${finalSchoolName}`);
        } catch (error) {
            this.logger.error(`Error sending pre-due alert to ${to}:`, error);
        }
    }

    async sendMoraAlert(schoolId: string, to: string, studentName: string, amount: number, daysOverdue: number, schoolName?: string) {
        const finalSchoolName = schoolName || (await this.prisma.school.findUnique({ where: { id: schoolId } }))?.name || 'Clubit';
        
        const variables = { studentName, amount, daysOverdue, schoolName: finalSchoolName };
        const { subject, body } = await this.getContent(schoolId, NotificationType.MORA, variables);

        try {
            await this.resend.emails.send({
                from: this.from,
                to: [to],
                subject: subject,
                html: this.getBaseTemplate(body, `El alumno ${studentName} tiene ${daysOverdue} días de mora.`, finalSchoolName),
            });
            this.logger.log(`Mora alert sent to ${to} for school ${finalSchoolName}`);
        } catch (error) {
            this.logger.error(`Error sending mora alert to ${to}:`, error);
        }
    }

    async sendManualLink(schoolId: string, to: string, studentName: string, paymentLink: string, schoolName?: string) {
        const finalSchoolName = schoolName || (await this.prisma.school.findUnique({ where: { id: schoolId } }))?.name || 'Clubit';
        
        const variables = { studentName, paymentLink, schoolName: finalSchoolName };
        const { subject, body } = await this.getContent(schoolId, NotificationType.MANUAL_LINK, variables);

        try {
            await this.resend.emails.send({
                from: this.from,
                to: [to],
                subject: subject,
                html: this.getBaseTemplate(body, `Accede aquí al link de pago para ${studentName}`, finalSchoolName),
            });
            this.logger.log(`Manual link sent to ${to} for school ${finalSchoolName}`);
        } catch (error) {
            this.logger.error(`Error sending manual link to ${to}:`, error);
        }
    }
}
