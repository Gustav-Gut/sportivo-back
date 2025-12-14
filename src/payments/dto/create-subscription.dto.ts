import { IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreateSubscriptionDto {
    @IsNumber()
    @IsPositive()
    @Min(100)
    price: number;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsNumber()
    @IsPositive()
    frequency: number; // Meses
}