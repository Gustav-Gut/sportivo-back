import { Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.student.findMany({
      where: { active: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    return this.prisma.student.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    // Soft delete para no perder historial de pagos
    return this.prisma.student.update({
      where: { id },
      data: { active: false },
    });
  }
}