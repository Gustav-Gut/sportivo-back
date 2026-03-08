import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

    public readonly userWithoutPassword: any;

    constructor(configService: ConfigService) {
        const pool = new Pool({ connectionString: configService.get<string>('DATABASE_URL') });
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