const axios = require('axios');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const baseUrl = 'http://localhost:3000/api';

async function runTest() {
    try {
        console.log('--- PASO 0: OBTENER DATOS DE PRUEBA (DEBUG) ---');
        const debugRes = await axios.post(`${baseUrl}/payments/test-webhook`, { command: 'get-ids' });
        const { planId, schoolSlug, userId } = debugRes.data;
        
        if (!planId || !schoolSlug || !userId) {
            throw new Error(`Faltan datos base. Plan: ${planId}, Slug: ${schoolSlug}, User: ${userId}`);
        }
        console.log(`Datos detectados: Plan=${planId}, User=${userId}`);

        console.log('\n--- PASO 1: LOGIN ---');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email: 'test@mercadopago.com',
            password: '123456',
            schoolSlug: schoolSlug
        });
        
        const cookies = loginRes.headers['set-cookie'];
        const cookie = cookies[0];
        console.log('Login exitoso.');

        console.log('\n--- PASO 2: CREAR SUSCRIPCIÓN ---');
        // Usamos el propio userId como studentId ya que el test es para este alumno.
        const subRes = await axios.post(`${baseUrl}/payments/create-subscription`, {
            planId: planId,
            email: 'test@mercadopago.com',
            studentId: userId 
        }, {
            headers: { 'Cookie': cookie }
        });
        const subscriptionId = subRes.data.subscriptionId || subRes.data.id;
        console.log(`Suscripción creada. ID: ${subscriptionId}`);

        console.log('\n--- PASO 3: CREAR PAGO VINCULADO ---');
        const createPayRes = await axios.post(`${baseUrl}/payments/create-link`, {
            amount: 15000,
            description: 'Mensualidad Abril',
            email: 'test@mercadopago.com',
            subscriptionId: subscriptionId,
            dueDate: new Date().toISOString()
        }, {
            headers: { 'Cookie': cookie }
        });
        
        const { paymentId } = createPayRes.data;
        console.log(`Pago vinculado creado. ID: ${paymentId}`);

        console.log('\n--- PASO 4: SIMULAR WEBHOOK DE APROBACIÓN ---');
        await axios.post(`${baseUrl}/payments/test-webhook`, {
            externalId: paymentId,
            status: 'approved',
            type: 'payment'
        });

        console.log('Webhook procesado exitosamente.');

        console.log('\n--- PASO 5: VERIFICAR PAGOS EN DB ---');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });
        const payments = await prisma.payment.findMany({
            where: { subscriptionId: subscriptionId },
            orderBy: { dueDate: 'asc' }
        });

        console.log(`PAGOS ENCONTRADOS: ${payments.length}`);
        payments.forEach((p, i) => {
            console.log(`Pago ${i + 1}: Vencimiento ${p.dueDate.toISOString()}, Estado: ${p.status}`);
        });

        if (payments.length > 1) {
            console.log('\n✅ ÉXITO: Se pre-generó el calendario de pagos correctamente.');
        } else {
            console.log('\n❌ ERROR: No se generó el calendario de pagos esperado.');
        }
        await prisma.$disconnect();

        console.log('\n--- PASO 5: VERIFICACIÓN FINAL ---');
        const finalSubsRes = await axios.get(`${baseUrl}/payments/subscriptions?email=test@mercadopago.com`, {
            headers: { 'Cookie': cookie }
        });
        const finalSub = finalSubsRes.data.find(s => s.id === subscriptionId);
        
        console.log('------------------------------------');
        console.log('RESULTADO FINAL:');
        console.log(`ID Pago: ${paymentId}`);
        console.log(`ID Suscripción: ${subscriptionId}`);
        console.log(`Estado Detalle: ${finalSub?.status}`);
        console.log('------------------------------------');

        if (finalSub?.status === 'ACTIVE') {
            console.log(' ✅ ¡RELACIÓN Y ACTIVACIÓN VALIDADA! ');
            
            console.log('\n--- PASO 6: CANCELAR SUSCRIPCIÓN (PRUEBA MANUAL) ---');
            await axios.post(`${baseUrl}/payments/cancel-subscription/${subscriptionId}`, {}, {
                headers: { 'Cookie': cookie }
            });
            console.log('Solicitud de cancelación enviada.');

            const cancelledSubsRes = await axios.get(`${baseUrl}/payments/subscriptions?email=test@mercadopago.com`, {
                headers: { 'Cookie': cookie }
            });
            const cancelledSub = cancelledSubsRes.data.find(s => s.id === subscriptionId);
            console.log(`Nuevo Estado: ${cancelledSub?.status}`);

            if (cancelledSub?.status === 'CANCELLED') {
                console.log(' ✅ ¡CANCELACIÓN VALIDADA! ');
            } else {
                console.log(' ❌ Error: La suscripción no se canceló.');
            }
        } else {
            console.log(' ❌ Error: La suscripción no se activó automáticamente.');
        }

    } catch (error) {
        // Imprimir el error de validación de Class-Validator si existe
        if (error.response && error.response.status === 400) {
            console.error('ERROR DE VALIDACIÓN (400):', JSON.stringify(error.response.data, null, 2));
        } else {
            const msg = error.response?.data?.message || error.message;
            console.error('ERROR EN EL TEST:', Array.isArray(msg) ? msg.join(', ') : msg);
        }
    }
}

runTest();
