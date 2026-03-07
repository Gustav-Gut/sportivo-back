import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) { }

  async create(createClassDto: CreateClassDto, schoolId: string) {
    const { facilityId, dayOfWeek, startTime, endTime } = createClassDto;

    // 1. Validar conflicto si hay cancha y horario definido
    if (facilityId && dayOfWeek !== undefined && startTime && endTime) {
      await this.checkScheduleConflict(facilityId, dayOfWeek, startTime, endTime);
    }

    return this.prisma.class.create({
      data: {
        ...createClassDto,
        schoolId,
      },
    });
  }

  async findAll(schoolId: string, user: { id: string, role: string }, pagination?: PaginationDto) {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    // Filtro de seguridad: Si es Coach, solo ve sus clases
    const whereClause: any = { schoolId, active: true };
    if (user.role === Role.COACH) {
      whereClause.coachId = user.id;
    }

    const [data, total] = await Promise.all([
      this.prisma.class.findMany({
        where: whereClause,
        include: {
          sport: true,
          coach: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { enrollments: true } }
        },
        skip,
        take: limit,
      }),
      this.prisma.class.count({
        where: whereClause,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, schoolId: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id, schoolId },
      include: {
        sport: true,
        coach: { select: { id: true, firstName: true, lastName: true } },
        enrollments: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, rut: true } }
          }
        }
      }
    });

    if (!classEntity) throw new NotFoundException('Class not found');
    return classEntity;
  }

  async update(id: string, updateClassDto: any, schoolId: string) {
    const { facilityId, dayOfWeek, startTime, endTime } = updateClassDto;

    if (facilityId || dayOfWeek !== undefined || startTime || endTime) {
      // Obtener datos actuales para completar los campos que falten en el update parcial
      const current = await this.findOne(id, schoolId);
      const fId = facilityId || current.facilityId;
      const dow = dayOfWeek !== undefined ? dayOfWeek : current.dayOfWeek;
      const st = startTime || (current.startTime ? current.startTime.toISOString() : null);
      const et = endTime || (current.endTime ? current.endTime.toISOString() : null);

      if (fId && dow !== null && st && et) {
        await this.checkScheduleConflict(fId, dow, st, et, id);
      }
    }

    return this.prisma.class.update({
      where: { id, schoolId },
      data: updateClassDto,
    });
  }

  private async checkScheduleConflict(
    facilityId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeClassId?: string
  ) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Solo comparamos las HORAS, ignorando la FECHA (ya que es recurrente por día de semana)
    const startHour = start.getUTCHours() * 60 + start.getUTCMinutes();
    const endHour = end.getUTCHours() * 60 + end.getUTCMinutes();

    const conflicts = await this.prisma.class.findMany({
      where: {
        facilityId,
        dayOfWeek,
        active: true,
        id: excludeClassId ? { not: excludeClassId } : undefined
      }
    });

    for (const c of conflicts) {
      if (!c.startTime || !c.endTime) continue;

      const cStart = new Date(c.startTime).getUTCHours() * 60 + new Date(c.startTime).getUTCMinutes();
      const cEnd = new Date(c.endTime).getUTCHours() * 60 + new Date(c.endTime).getUTCMinutes();

      // Lógica de traslape: (Start1 < End2) AND (End1 > Start2)
      if (startHour < cEnd && endHour > cStart) {
        throw new ConflictException(`La cancha ya está ocupada por la clase "${c.name}" en ese horario.`);
      }
    }
  }

  async remove(id: string, schoolId: string) {
    return this.prisma.class.update({
      where: { id, schoolId },
      data: { active: false },
    });
  }

  async enrollStudent(classId: string, enrollDto: EnrollStudentDto, schoolId: string) {
    // 1. Verificar que la clase existe y pertenece al colegio
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: { _count: { select: { enrollments: true } } }
    });

    if (!classEntity) throw new NotFoundException('Class not found');

    // 2. Validar límite de alumnos si existe
    if (classEntity.maxStudents && classEntity._count.enrollments >= classEntity.maxStudents) {
      throw new BadRequestException(`Class has reached its maximum capacity of ${classEntity.maxStudents} students`);
    }

    // 3. Inscribir alumno (Prisma lanzará error si ya está inscrito por el @@unique)
    try {
      return await this.prisma.classEnrollment.create({
        data: {
          classId,
          studentId: enrollDto.studentId
        }
      });
    } catch (error) {
      // P2002 es el código de Prisma para violación de variable única (@@unique[classId, studentId])
      if (error.code === 'P2002') {
        throw new ConflictException('Student is already enrolled in this class');
      }
      throw error;
    }
  }

  async unenrollStudent(classId: string, studentId: string, schoolId: string) {
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        classId,
        studentId,
        class: { schoolId } // Asegurar que el colegio de la clase es correcto
      }
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    return this.prisma.classEnrollment.delete({
      where: { id: enrollment.id }
    });
  }
}
