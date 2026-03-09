import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';

export class CreateLessonDto {
    @ApiProperty({ example: 'Selectivo Sub-17', description: 'Nombre de la lección' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'uuid-deporte-123', description: 'ID del deporte asociado' })
    @IsString()
    @IsNotEmpty()
    sportId: string;

    @ApiProperty({ example: 'uuid-coach-123', description: 'ID del profesor' })
    @IsString()
    coachId: string;

    @ApiProperty({ example: 'MONDAY', enum: DayOfWeek, description: 'Día de la semana' })
    @IsEnum(DayOfWeek)
    dayOfWeek: DayOfWeek;

    @ApiProperty({ example: '17:00', description: 'Hora de inicio (HH:mm)' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:mm format' })
    startTime: string;

    @ApiProperty({ example: '19:00', description: 'Hora de fin (HH:mm)' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:mm format' })
    endTime: string;

    @ApiProperty({ example: 'uuid-cancha-123', description: 'ID de la instalación' })
    @IsString()
    facilityId: string;

    @ApiProperty({ example: 22, description: 'Límite de alumnos' })
    @IsInt()
    @Min(1)
    maxStudents: number;

    @ApiProperty({ example: true, description: 'Estado de la lección' })
    @IsBoolean()
    active: boolean;
}
