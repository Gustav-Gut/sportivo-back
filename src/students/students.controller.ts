import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, UnauthorizedException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Post()
  create(
    @Body() createStudentDto: CreateStudentDto,
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header');
    return this.studentsService.create(createStudentDto, schoolId);
  }

  @Get()
  findAll(
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header');
    return this.studentsService.findAll(schoolId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header');
    return this.studentsService.findOne(id, schoolId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header');
    return this.studentsService.update(id, updateStudentDto, schoolId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header');
    return this.studentsService.remove(id, schoolId);
  }
}
