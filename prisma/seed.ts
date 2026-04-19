import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Iniciando la siembra (seeding)...');

    // 1. Crear Escuela
    const school = await prisma.school.upsert({
        where: { slug: 'clubit-hq' },
        update: {},
        create: {
            name: 'Clubit HQ',
            slug: 'clubit-hq',
            address: 'Vicuña Mackenna 123',
        },
    });

    // 2. Crear Superadmin
    const saltRounds = Number(process.env.SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash('2768696Clubit!', saltRounds);

    const superadmin = await prisma.user.upsert({
        where: { email_schoolId: { email: 'gustav@clubit.cl', schoolId: school.id } },
        update: {},
        create: {
            firstName: 'Gustav',
            lastName: 'Gutierrez',
            rut: '16615578-9',
            email: 'gustav@clubit.cl',
            password: hashedPassword,
            roles: ['SUPERADMIN'],
            schoolId: school.id,
        },
    });

    // 3. Crear Deporte Global (Plantilla base inmutable para el sistema)
    const sport = await prisma.sport.upsert({
        where: { name: 'Football' },
        update: {}, // No tocamos los campos globales si ya existen para evitar efectos secundarios
        create: {
            name: 'Football',
            defaultFields: {
                student: [
                    { key: 'position', label: 'Position', type: 'text', required: true },
                    { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: false }
                ],
                coach: [
                    { key: 'license_level', label: 'License Level', type: 'text', required: true }
                ]
            }
        }
    });

    // 4. Configuración de la Escuela (Aquí es donde ocurre la magia de la personalización)
    const schoolSport = await prisma.schoolSport.upsert({
        where: { schoolId_sportId: { schoolId: school.id, sportId: sport.id } },
        update: {
            customFields: {
                student: [
                    { key: 'position', label: 'Posición en Cancha', type: 'text', required: true },
                    { key: 'jersey_number', label: 'Número de Camiseta', type: 'number', required: false },
                    { key: 'play_style', label: 'Estilo de Juego', type: 'text', required: false }
                ],
                coach: [
                    { key: 'license_level', label: 'Nivel de Licencia', type: 'text', required: true },
                    { key: 'preferred_formation', label: 'Formación Preferida', type: 'text', required: false }
                ]
            }
        },
        create: {
            schoolId: school.id,
            sportId: sport.id,
            customFields: {
                student: [
                    { key: 'position', label: 'Posición en Cancha', type: 'text', required: true },
                    { key: 'jersey_number', label: 'Número de Camiseta', type: 'number', required: false },
                    { key: 'play_style', label: 'Estilo de Juego', type: 'text', required: false }
                ],
                coach: [
                    { key: 'license_level', label: 'Nivel de Licencia', type: 'text', required: true },
                    { key: 'preferred_formation', label: 'Formación Preferida', type: 'text', required: false }
                ]
            }
        }
    });

    console.log({ school, superadmin, sport, schoolSportId: schoolSport.id });
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
