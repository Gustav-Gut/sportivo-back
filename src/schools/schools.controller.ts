import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) { }

  @Roles(Role.SUPERADMIN)
  @Post()
  create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.create(createSchoolDto);
  }

  @Roles(Role.SUPERADMIN)
  @Get('all')
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get()
  findOne(
    @Headers('x-school-id') schoolId: string) {
    return this.schoolsService.findOne(schoolId);
  }

  @Roles(Role.ADMIN)
  @Patch()
  update(
    @Headers('x-school-id') schoolId: string,
    @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsService.update(schoolId, updateSchoolDto);
  }

  @Roles(Role.SUPERADMIN)
  @Delete()
  remove(
    @Headers('x-school-id') schoolId: string) {
    return this.schoolsService.remove(schoolId);
  }
}
