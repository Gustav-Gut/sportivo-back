import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
    @ApiProperty({ example: 45000, description: 'Precio de la suscripción' })
    @IsNumber()
    @IsPositive()
    @Min(100)
    price: number;

    @ApiProperty({ example: 'papa@test.com', description: 'Email del pagador' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Plan Mensual Sub-17', description: 'Nombre o ID del plan' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiProperty({ example: 1, description: 'Frecuencia en meses' })
    @IsNumber()
    @IsPositive()
    frequency: number; // Meses

    @ApiProperty({ example: 'uuid-estudiante-123', description: 'ID del estudiante (opcional)', required: false })
    @IsString()
    @IsOptional()
    studentId?: string;
}