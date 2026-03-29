import { IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
    @IsNumber()
    @IsPositive()
    @Min(100) // ajustar monoto mínimo según moneda (CLP)
    amount: number;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    subscriptionId: string;

    @IsString()
    @IsNotEmpty()
    dueDate: string;
}