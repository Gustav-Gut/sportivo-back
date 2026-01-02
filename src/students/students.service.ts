import { Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateStudentDto, schoolId: string) {
    return this.prisma.student.create({
      data: {
        ...dto,
        schoolId,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.student.findMany({
      where: {
        active: true,
        schoolId,
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    return this.prisma.student.findFirst({
      where: {
        id,
        schoolId,
        active: true,
      },
    });
  }

  async update(id: string, dto: UpdateStudentDto, schoolId: string) {
    return this.prisma.student.update({
      where: {
        id,
        schoolId,
      },
      data: dto,
    });
  }

  async remove(id: string, schoolId: string) {
    // Soft delete para no perder historial de pagos
    return this.prisma.student.update({
      where: {
        id,
        schoolId,
      },
      data: { active: false },
    });
  }
}