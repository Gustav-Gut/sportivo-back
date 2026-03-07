import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFacilityDto {
    @ApiProperty({ example: 'Cancha 1', description: 'Nombre de la instalación o recinto' })
    @IsString()
    @IsNotEmpty()
    name: string;
}
