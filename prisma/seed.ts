import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando la siembra (seeding)...');

    // 1. Crear Escuela
    const school = await prisma.school.upsert({
        where: { slug: 'sportivo-hq' },
        update: {},
        create: {
            name: 'Sportivo HQ',
            slug: 'sportivo-hq',
            address: 'Vicuña Mackenna 123',
        },
    });

    // 2. Crear Superadmin
    const hashedPassword = await bcrypt.hash('2768696Sportivo!', 12);

    const superadmin = await prisma.user.upsert({
        where: { email_schoolId: { email: 'gustav@sportivo.com', schoolId: school.id } },
        update: {},
        create: {
            firstName: 'Gustav',
            lastName: 'Gutierrez',
            rut: '16615578-9',
            email: 'gustav@sportivo.com',
            password: hashedPassword,
            role: 'SUPERADMIN',
            schoolId: school.id,
        },
    });

    console.log({ school, superadmin });
    console.log('✅ Siembra completada.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
