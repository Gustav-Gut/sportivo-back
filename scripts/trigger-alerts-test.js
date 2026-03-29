const axios = require('axios');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const baseUrl = 'http://localhost:3000';

async function runAlertTest() {
    const type = process.argv[2] || 'pre-due'; // 'pre-due' or 'mora'
    
    console.log(`--- PREPARANDO PRUEBA DE ALERTA: ${type.toUpperCase()} ---`);
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        // Encontrar un pago pendiente (excluyendo el que se acaba de pagar en la simulación si es posible)
        const payment = await prisma.payment.findFirst({
            where: { 
                status: 'PENDING'
            },
            include: { school: true }
        });

        if (!payment) {
            console.error('No se encontraron pagos PENDING adecuados en la base de datos.');
            return;
        }

        const newDueDate = new Date();
        if (type === 'pre-due') {
            // TasksService busca pagos con vencimiento EXACTO en (hoy + preDueAlertDays)
            newDueDate.setDate(newDueDate.getDate() + payment.school.preDueAlertDays);
            // Ajustar a las 12:00 PM para evitar problemas de zona horaria con el truncado a 00:00:00
            newDueDate.setHours(12, 0, 0, 0);
        } else {
            // TasksService busca pagos con vencimiento <= (hoy - moraAlertDays)
            newDueDate.setDate(newDueDate.getDate() - payment.school.moraAlertDays - 1);
            newDueDate.setHours(12, 0, 0, 0);
        }
        
        // Reset lastAlertSentAt to allow the alert to trigger
        await prisma.payment.update({
            where: { id: payment.id },
            data: { 
                dueDate: newDueDate,
                lastAlertSentAt: null
            }
        });

        // Asegurar que el usuario tenga rol ADMIN para recibir alertas de mora
        await prisma.user.update({
            where: { id: payment.payerId },
            data: { roles: { set: ['STUDENT', 'ADMIN'] } }
        });

        console.log(`Pago ID: ${payment.id} actualizado.`);
        console.log(`Usuario ID: ${payment.payerId} actualizado con rol ADMIN.`);
        console.log(`Nuevo DueDate: ${newDueDate.toISOString()}`);
        console.log(`Configuración Escuela: Pre-Due=${payment.school.preDueAlertDays} días, Mora=${payment.school.moraAlertDays} días`);

        console.log('\n--- DISPARANDO ALERTAS MANUALMENTE (POST /payments/trigger-alerts) ---');
        await axios.post(`${baseUrl}/payments/trigger-alerts`);
        
        console.log('\n✅ Comando de alertas enviado exitosamente.');
        console.log('IMPORTANTE: Revisa los logs de tu servidor NestJS para ver los logs de [NOTIFY].');

    } catch (err) {
        if (err.response) {
            console.error('ERROR EN EL SERVIDOR:', err.response.data);
        } else {
            console.error('ERROR EN EL TEST:', err.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

runAlertTest();
