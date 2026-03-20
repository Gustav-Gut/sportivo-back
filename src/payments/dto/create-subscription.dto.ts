import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
    @ApiProperty({ example: 'uuid-plan-123', description: 'ID del plan a suscribir' })
    @IsUUID()
    @IsNotEmpty()
    planId: string;

    @ApiProperty({ example: 'papa@test.com', description: 'Email del pagador' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'uuid-estudiante-123', description: 'ID del estudiante (opcional, si el pagador es el tutor)', required: false })
    @IsString()
    @IsOptional()
    studentId?: string;
}