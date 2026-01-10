import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateSchoolDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
    slug: string;

    @IsString()
    @IsOptional()
    address?: string;
}