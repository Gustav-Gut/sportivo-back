import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * Query DTO for GET /users
 * Extends PaginationDto (page, limit, search) and adds the optional `roles`
 * filter so users can be narrowed down by role (e.g. STUDENT, COACH).
 */
export class UsersQueryDto extends PaginationDto {
    @ApiProperty({ required: false, example: 'STUDENT', description: 'Comma-separated list of roles to filter by' })
    @IsOptional()
    @IsString()
    roles?: string;
}
