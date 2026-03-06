import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class CreateUserTutorDto {
    @IsString()
    @IsNotEmpty()
    tutorId: string;

    @IsString()
    @IsNotEmpty()
    relationType: string;
}

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsString()
    @IsNotEmpty()
    rut: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEnum(Role)
    @IsNotEmpty()
    role: Role;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateUserTutorDto)
    tutors?: CreateUserTutorDto[];
}