import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'super-secret-test-key-123';

describe('Schools Module (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let superAdminToken: string;

    const superAdminData = {
        email: 'superadmin.schools@sportivo.test',
        password: 'securePass123!',
        firstName: 'Super',
        lastName: 'Admin',
        rut: '99.999.999-K',
        role: Role.SUPERADMIN
    };

    const newSchoolData = {
        name: 'New Horizon Academy',
        slug: 'new-horizon',
        address: '123 Education Lane',
        active: true
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = app.get(PrismaService);

        // 1. Cleanup
        try {
            await prisma.subscription.deleteMany();
            await prisma.payment.deleteMany();
            await prisma.student.deleteMany();
            await prisma.user.deleteMany();
            await prisma.plan.deleteMany();
            await prisma.school.deleteMany();
        } catch (error) {
            console.error('CLEANUP ERROR DETAILS:', JSON.stringify(error, null, 2));
            throw error;
        }

        // 2. Seed System School
        const systemSchool = await prisma.school.upsert({
            where: { slug: 'system' },
            update: {},
            create: {
                name: 'System School',
                slug: 'system',
                address: 'Cloud'
            }
        });

        // 3. Seed SuperAdmin
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
                schoolId: systemSchool.id
            }
        });

        // 4. Login to get Token
        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .set('x-internal-api-key', INTERNAL_API_KEY)
            .send({
                email: superAdminData.email,
                password: superAdminData.password,
                schoolSlug: 'system'
            });

        superAdminToken = loginResponse.body.access_token;
    });

    afterAll(async () => {
        await app.close();
    });

    // --- Positive Tests ---

    it('/schools (POST) - Create School (SuperAdmin)', async () => {
        const response = await request(app.getHttpServer())
            .post('/schools')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .set('x-role', Role.SUPERADMIN)
            .set('x-internal-api-key', INTERNAL_API_KEY)
            .send(newSchoolData)
            .expect(201);

        expect(response.body.slug).toBe(newSchoolData.slug);
        expect(response.body.id).toBeDefined();
    });

    it('/schools/all (GET) - List Schools (SuperAdmin)', async () => {
        const response = await request(app.getHttpServer())
            .get('/schools/all')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .set('x-role', Role.SUPERADMIN)
            .set('x-internal-api-key', INTERNAL_API_KEY)
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2); // System + New Horizon
    });

    // --- Negative / Security Tests ---

    it('/schools (POST) - Fail Duplicate Slug', async () => {
        await request(app.getHttpServer())
            .post('/schools')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .set('x-role', Role.SUPERADMIN)
            .set('x-internal-api-key', INTERNAL_API_KEY)
            .send(newSchoolData) // Sending same data
            .expect(409); // Conflict
    });

    it('/schools (POST) - Fail without Api Key', async () => {
        await request(app.getHttpServer())
            .post('/schools')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .set('x-role', Role.SUPERADMIN)
            // Missing x-internal-api-key
            .send({
                name: 'Hacker School',
                slug: 'hacker-school',
            })
            .expect(401);
    });

    it('/schools (POST) - Fail as Non-SuperAdmin', async () => {
        // We can iterate this to test standard user access later
        // asking for 403 Forbidden effectively
        await request(app.getHttpServer())
            .post('/schools')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .set('x-role', Role.ADMIN) // Downgrade role in header
            .set('x-internal-api-key', INTERNAL_API_KEY)
            .send({
                name: 'Unauthorized School',
                slug: 'unauthorized',
            })
            .expect(403);
    });
});
