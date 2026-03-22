import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentSchoolId } from '../auth/decorators/current-school-id.decorator';
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

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @CurrentSchoolId() schoolId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.schoolsService.uploadLogo(schoolId, file);
  }

  @Roles(Role.SUPERADMIN)
  @Get('all')
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get()
  findOne(
    @CurrentSchoolId() schoolId: string) {
    return this.schoolsService.findOne(schoolId);
  }

  @Roles(Role.ADMIN)
  @Patch()
  update(
    @CurrentSchoolId() schoolId: string,
    @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsService.update(schoolId, updateSchoolDto);
  }

  @Roles(Role.SUPERADMIN)
  @Delete()
  remove(
    @CurrentSchoolId() schoolId: string) {
    return this.schoolsService.remove(schoolId);
  }
}
