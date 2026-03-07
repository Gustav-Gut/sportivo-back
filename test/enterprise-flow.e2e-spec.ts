import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { FacilitiesService } from '../src/facilities/facilities.service';
import { ClassesService } from '../src/classes/classes.service';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';

describe('Enterprise Flow (Integration Test)', () => {
    let app: TestingModule;
    let facilitiesService: FacilitiesService;
    let classesService: ClassesService;
    let paymentsService: PaymentsService;
    let prismaService: PrismaService;

    beforeAll(async () => {
        const mockPaymentGateway = {
            provider: 'MERCADOPAGO',
            createPaymentLink: jest.fn().mockResolvedValue('http://mock-link.com'),
            createSubscription: jest.fn().mockResolvedValue('http://mock-sub-link.com'),
            getPaymentStatus: jest.fn(),
            getSubscriptionStatus: jest.fn(),
            searchSubscriptions: jest.fn(),
        };

        app = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider('PAYMENT_GATEWAY')
            .useValue(mockPaymentGateway)
            .compile();

        facilitiesService = app.get<FacilitiesService>(FacilitiesService);
        classesService = app.get<ClassesService>(ClassesService);
        paymentsService = app.get<PaymentsService>(PaymentsService);
        prismaService = app.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        await app.close();
    });

    it('debería completar el flujo completo: Canchas -> Clases -> Cobros Independientes/Dependientes', async () => {
        console.log('--- [DEMO] INICIO DE FLUJO ENTERPRISE ---');

        // 1. Obtener School
        const school = await prismaService.school.findFirst();
        expect(school).toBeDefined();
        console.log(`Colegio: ${school!.name}`);

        // 2. Crear una Cancha (Facility)
        console.log('\n--- FASE 1: GESTIÓN DE INSTALACIONES ---');
        const cancha = await facilitiesService.create({
            name: 'Cancha Principal - Pasto Sintético'
        }, school!.id);
        expect(cancha.name).toBe('Cancha Principal - Pasto Sintético');
        console.log(`✅ Cancha creada: ${cancha.name}`);

        // 3. Crear Deporte y Clase
        let sport = await prismaService.sport.findFirst({ where: { name: 'Fútbol' } });
        if (!sport) {
            sport = await prismaService.sport.create({
                data: { name: 'Fútbol', defaultFields: {} }
            });
        }

        const claseSeba = await classesService.create({
            name: 'Selectivo Sub-17',
            sportId: sport.id,
            facilityId: cancha.id,
            dayOfWeek: 2, // Martes
            startTime: new Date('2024-01-01T17:00:00Z').toISOString(),
            endTime: new Date('2024-01-01T19:00:00Z').toISOString(),
            maxStudents: 22
        }, school!.id);
        expect(claseSeba.facilityId).toBe(cancha.id);
        console.log(`✅ Clase creada: ${claseSeba.name} asignada a ${cancha.name}`);

        // 3.1. Intentar crear una clase que choque en horario
        console.log('\n--- Probando validación de conflictos ---');
        try {
            await classesService.create({
                name: 'Clase Fantasma (Choque)',
                sportId: sport.id,
                facilityId: cancha.id,
                dayOfWeek: 2, // Mismo día
                startTime: new Date('2024-01-01T18:00:00Z').toISOString(), // Choca con 17:00-19:00
                endTime: new Date('2024-01-01T20:00:00Z').toISOString(),
                maxStudents: 10
            }, school!.id);
            fail('Debería haber lanzado un ConflictException');
        } catch (error) {
            expect(error.status).toBe(409); // Conflict
            console.log(`✅ Validación exitosa: ${error.message}`);
        }
        const calendar = await facilitiesService.getCalendar(school!.id);
        console.log('\n--- VISTA DE CALENDARIO (CRUCE CLASES vs CANCHAS) ---');
        console.dir(calendar, { depth: null });

        // 5. Simular Usuarios para Cobros
        console.log('\n--- FASE 2: COBROS Y SUSCRIPCIONES (MULTI-PAGADOR) ---');

        // Estudiante Independiente (Paga él mismo)
        const adultStudent = await prismaService.user.upsert({
            where: { email_schoolId: { email: 'adulto@test.com', schoolId: school!.id } },
            update: {},
            create: {
                firstName: 'Estudiante',
                lastName: 'Adulto',
                email: 'adulto@test.com',
                rut: '111-1',
                password: 'password',
                role: Role.STUDENT,
                schoolId: school!.id
            }
        });

        // Tutor y Estudiante Dependiente
        const tutor = await prismaService.user.upsert({
            where: { email_schoolId: { email: 'papa@test.com', schoolId: school!.id } },
            update: {},
            create: {
                firstName: 'Padre',
                lastName: 'Responsable',
                email: 'papa@test.com',
                rut: '222-2',
                password: 'password',
                role: Role.TUTOR,
                schoolId: school!.id
            }
        });

        const dependentChild = await prismaService.user.upsert({
            where: { email_schoolId: { email: 'hijo@test.com', schoolId: school!.id } },
            update: {},
            create: {
                firstName: 'Hijo',
                lastName: 'Pequeño',
                email: 'hijo@test.com',
                rut: '333-3',
                password: 'password',
                role: Role.STUDENT,
                schoolId: school!.id
            }
        });

        // Crear un Plan
        const plan = await prismaService.plan.upsert({
            where: { name_schoolId: { name: 'Plan Mensual Sub-17', schoolId: school!.id } },
            update: {},
            create: {
                name: 'Plan Mensual Sub-17',
                description: 'Acceso a 3 entrenamientos semanales',
                price: 45000,
                schoolId: school!.id
            }
        });

        // 6. Ejecutar Suscripciones
        console.log('\n--- Generando Links de Pago ---');

        // Caso 1: Adulto paga por sí mismo
        const subAdulto = await paymentsService.createSubscription(
            plan.price,
            adultStudent.email,
            plan.id,
            1,
            school!.id
        );
        expect(subAdulto.subscriptionId).toBeDefined();
        console.log(`✅ [Adulto] Suscripción creada. Pagador: Adulto, Alumno: Adulto.`);

        // Caso 2: Tutor paga por su hijo
        const subHijo = await paymentsService.createSubscription(
            plan.price,
            tutor.email,
            plan.id,
            1,
            school!.id,
            dependentChild.id
        );
        expect(subHijo.subscriptionId).toBeDefined();
        console.log(`✅ [Dependiente] Suscripción creada. Pagador: Tutor, Alumno: Hijo.`);

        // Verificando en BD
        const records = await prismaService.subscription.findMany({
            where: { schoolId: school!.id, OR: [{ payerId: tutor.id }, { payerId: adultStudent.id }] },
            include: { payer: true, student: true }
        });

        console.log('\n--- VERIFICACIÓN EN BASE DE DATOS ---');
        records.forEach(r => {
            console.log(`Sub ID: ${r.id.substring(0, 8)} | Paga: ${r.payer.firstName} | Beneficia: ${r.student.firstName} | Status: ${r.status}`);
            if (r.payerId === tutor.id) {
                expect(r.studentId).toBe(dependentChild.id);
            } else {
                expect(r.studentId).toBe(adultStudent.id);
            }
        });

        console.log('\n--- [DEMO] FLUJO COMPLETADO EXITOSAMENTE ---');
    }, 30000); // 30s timeout
});
