
import { Exclude } from 'class-transformer';
import { Role } from '@prisma/client';

export class User {
    id: string;
    rut: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    schoolId: string;
    roles: Role[];

    @Exclude()
    password: string;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}
