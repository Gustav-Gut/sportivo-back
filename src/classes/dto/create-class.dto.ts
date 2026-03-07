import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
    @ApiProperty({ example: 'Selectivo Sub-17', description: 'Nombre de la clase' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'uuid-deporte-123', description: 'ID del deporte asociado' })
    @IsString()
    @IsNotEmpty()
    sportId: string;

    @ApiProperty({ example: 'uuid-coach-123', description: 'ID del profesor (opcional)', required: false })
    @IsString()
    @IsOptional()
    coachId?: string;

    @ApiProperty({ example: 2, description: 'Día de la semana (0=Dom, 1=Lun, etc.)', required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    dayOfWeek?: number;

    @ApiProperty({ example: '2024-01-01T17:00:00Z', description: 'Hora de inicio (ISO)', required: false })
    @IsString()
    @IsOptional()
    startTime?: string;

    @ApiProperty({ example: '2024-01-01T19:00:00Z', description: 'Hora de fin (ISO)', required: false })
    @IsString()
    @IsOptional()
    endTime?: string;

    @ApiProperty({ example: 'uuid-cancha-123', description: 'ID de la instalación', required: false })
    @IsString()
    @IsOptional()
    facilityId?: string;

    @ApiProperty({ example: 22, description: 'Límite de alumnos', required: false })
    @IsInt()
    @Min(1)
    @IsOptional()
    maxStudents?: number;

    @ApiProperty({ example: true, description: 'Estado de la clase', required: false })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
