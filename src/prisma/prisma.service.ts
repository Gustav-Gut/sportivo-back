import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

    public readonly userWithoutPassword: any;

    constructor() {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
        const adapter = new PrismaPg(pool);
        super({ adapter });

        this.userWithoutPassword = this.$extends({
            result: {
                user: {
                    password: {
                        compute() {
                            return undefined;
                        },
                    }
                }
            },
        });
    }

    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
}