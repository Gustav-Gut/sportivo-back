import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'super-secret-test-key-123';

describe('Auth Flow (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const superAdminData = {
        email: 'superadmin@sportivo.test',
        password: 'superSecretPassword123!',
        firstName: 'Super',
        lastName: 'Admin',
        phone: '000-0000',
        rut: '1-9',
        role: Role.SUPERADMIN
    };

    const schoolData = {
        name: 'E2E Test School',
        slug: 'e2e-school',
        address: '123 Test St',
    };

    let jwtToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get(PrismaService);

        // 1. Limpiar BD (Orden estricto por Foreign Keys)
        await prisma.subscription.deleteMany();
        await prisma.payment.deleteMany();
        await prisma.student.deleteMany();
        await prisma.user.deleteMany();
        await prisma.plan.deleteMany();
        await prisma.school.deleteMany();

        // 2. Crear
        // 2. Crear (Upsert para evitar colisiones)
        console.log('2. Seeding System School...');
        const systemSchool = await prisma.school.upsert({
            where: { slug: 'system' },
            update: {},
            create: {
                name: 'System School',
                slug: 'system',
                address: 'Cloud',
                active: true
            }
        });

        console.log('3. Seeding SuperAdmin...');
        const hashedPassword = await bcrypt.hash(superAdminData.password, 10);
        await prisma.user.upsert({
            where: {
                email_schoolId: {
                    email: superAdminData.email,
                    schoolId: systemSchool.id
                }
            },
            update: { password: hashedPassword, role: Role.SUPERADMIN },
            create: {
                ...superAdminData,
                password: hashedPassword,
                schoolId: systemSchool.id,
                active: true
            }
        });
    });

    afterAll(async () => {
        await app.close();
    });

    // 1. Login exitoso como SuperAdmin
    it('/auth/login (POST) - Login as SuperAdmin', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .set('x-internal-api-key', INTERNAL_API_KEY)
            .send({
                email: superAdminData.email,
                password: superAdminData.password,
                schoolSlug: 'system'
            })
            .expect(201);

        jwtToken = response.body.access_token;
        expect(jwtToken).toBeDefined();
    });

    // 2. Crear Escuela (Protegido por SuperAdmin)
    it('/schools (POST) - Create a new School', async () => {
        const response = await request(app.getHttpServer())
            .post('/schools')
            .set('Authorization', `Bearer ${jwtToken}`)
            .set('x-role', Role.SUPERADMIN)  // Simulating KrakenD Header
            .set('x-internal-api-key', INTERNAL_API_KEY)
            .send(schoolData)
            .expect(201);

        expect(response.body.id).toBeDefined();
        expect(response.body.slug).toBe(schoolData.slug);
    });

    // 3. Verificar que la escuela existe (Protegido)
    it('/schools/all (GET) - Find created school', async () => {
        const response = await request(app.getHttpServer())
            .get('/schools/all')
            .set('Authorization', `Bearer ${jwtToken}`)
            .set('x-role', Role.SUPERADMIN) // Simulating KrakenD Header
            .set('x-internal-api-key', INTERNAL_API_KEY)
            .expect(200);

        const schools = response.body;
        expect(Array.isArray(schools)).toBe(true);
        expect(schools.some((s: any) => s.slug === schoolData.slug)).toBe(true);
    });
});
