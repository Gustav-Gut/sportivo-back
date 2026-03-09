import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested, IsArray, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class CreateStudentProfileDto {
    @IsOptional() @IsDateString() birthDate?: string;
    @IsOptional() @IsNumber() weight?: number;
    @IsOptional() @IsNumber() height?: number;
    @IsOptional() @IsString() bloodType?: string;
    @IsOptional() @IsString() medicalNotes?: string;

    // Dynamic Custom Fields Data
    @IsOptional()
    sportData?: any;
}

export class CreateTutorProfileDto {
    @IsOptional() @IsString() emergencyContact?: string;
    @IsOptional() @IsString() address?: string;
    @IsOptional() @IsString() occupation?: string;
}

export class CreateCoachProfileDto {
    @IsOptional() @IsString() bio?: string;
    @IsOptional() @IsString() specialty?: string;
    @IsOptional() @IsNumber() yearsExperience?: number;
    @IsOptional() @IsString() certifications?: string;
}

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

    @IsArray()
    @IsEnum(Role, { each: true })
    @IsNotEmpty()
    roles: Role[];

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateStudentProfileDto)
    studentProfile?: CreateStudentProfileDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateTutorProfileDto)
    tutorProfile?: CreateTutorProfileDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateCoachProfileDto)
    coachProfile?: CreateCoachProfileDto;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateUserTutorDto)
    tutors?: CreateUserTutorDto[];
}