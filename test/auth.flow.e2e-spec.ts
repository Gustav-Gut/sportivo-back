import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

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
        try { await prisma.subscription.deleteMany(); } catch { }
        try { await prisma.payment.deleteMany(); } catch { }
        try { await prisma.student.deleteMany(); } catch { }
        try { await prisma.user.deleteMany(); } catch { }
        try { await prisma.plan.deleteMany(); } catch { }
        try { await prisma.school.deleteMany(); } catch { }

        // 2. Crear
        console.log('2. Seeding System School...');
        const systemSchool = await prisma.school.create({
            data: {
                name: 'System School',
                slug: 'system',
                address: 'Cloud',
                active: true
            }
        });

        console.log('3. Seeding SuperAdmin...');
        const hashedPassword = await bcrypt.hash(superAdminData.password, 10);
        await prisma.user.create({
            data: {
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
            .set('x-role', Role.SUPERADMIN) // Simulating KrakenD Header
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
            .expect(200);

        const schools = response.body;
        expect(Array.isArray(schools)).toBe(true);
        expect(schools.some((s: any) => s.slug === schoolData.slug)).toBe(true);
    });
});
