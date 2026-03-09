import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Role, DayOfWeek } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) { }

  async create(createLessonDto: CreateLessonDto, schoolId: string) {
    const { facilityId, dayOfWeek, startTime, endTime } = createLessonDto;

    // 1. Validar conflicto si hay cancha y horario definido
    if (facilityId && dayOfWeek && startTime && endTime) {
      await this.checkScheduleConflict(facilityId, dayOfWeek, startTime, endTime);
    }

    return this.prisma.lesson.create({
      data: {
        ...createLessonDto,
        schoolId,
      },
    });
  }

  async findAll(schoolId: string, user: { id: string, roles: Role[] }, pagination?: PaginationDto, search?: string) {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    // Filtro de seguridad: Si es Coach, solo ve sus lecciones
    const whereClause: any = {
      schoolId,
      active: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sport: { name: { contains: search, mode: 'insensitive' } } },
        ]
      })
    };
    if (user.roles.includes(Role.COACH)) {
      whereClause.coachId = user.id;
    }

    const [data, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where: whereClause,
        include: {
          sport: true,
          coach: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { enrollments: true } }
        },
        skip,
        take: limit,
      }),
      this.prisma.lesson.count({
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
    const lessonEntity = await this.prisma.lesson.findFirst({
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

    if (!lessonEntity) throw new NotFoundException('Lesson not found');
    return lessonEntity;
  }

  async update(id: string, updateLessonDto: any, schoolId: string) {
    const { facilityId, dayOfWeek, startTime, endTime } = updateLessonDto;

    if (facilityId || dayOfWeek || startTime || endTime) {
      // Obtener datos actuales para completar los campos que falten en el update parcial
      const current = await this.findOne(id, schoolId);
      const fId = facilityId || current.facilityId;
      const dow = dayOfWeek || current.dayOfWeek;
      const st = startTime || current.startTime;
      const et = endTime || current.endTime;

      if (fId && dow && st && et) {
        await this.checkScheduleConflict(fId, dow, st, et, id);
      }
    }

    return this.prisma.lesson.update({
      where: { id, schoolId },
      data: updateLessonDto,
    });
  }

  private async checkScheduleConflict(
    facilityId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    excludelessonId?: string
  ) {
    // Almacenamos la pura hora tipo 18:00
    // Convertimos de HH:mm a Minutos Totales para cálculo matemático simple
    const processTime = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);

    const startMins = processTime(startTime);
    const endMins = processTime(endTime);

    const conflicts = await this.prisma.lesson.findMany({
      where: {
        facilityId,
        dayOfWeek,
        active: true,
        id: excludelessonId ? { not: excludelessonId } : undefined
      }
    });

    for (const c of conflicts) {
      if (!c.startTime || !c.endTime) continue;

      const cStart = processTime(c.startTime);
      const cEnd = processTime(c.endTime);

      // Lógica de traslape: (StartMin1 < EndMin2) AND (EndMin1 > StartMin2)
      if (startMins < cEnd && endMins > cStart) {
        throw new ConflictException(`La cancha ya está ocupada por la lección "${c.name}" en ese horario.`);
      }
    }
  }

  async remove(id: string, schoolId: string) {
    return this.prisma.lesson.update({
      where: { id, schoolId },
      data: { active: false },
    });
  }

  async enrollStudent(lessonId: string, enrollDto: EnrollStudentDto, schoolId: string) {
    // 1. Verificar que la clase existe y pertenece al colegio
    const lessonEntity = await this.prisma.lesson.findFirst({
      where: { id: lessonId, schoolId },
      include: { _count: { select: { enrollments: true } } }
    });

    if (!lessonEntity) throw new NotFoundException('Class not found');

    // 2. Validar límite de alumnos si existe
    if (lessonEntity.maxStudents && lessonEntity._count.enrollments >= lessonEntity.maxStudents) {
      throw new BadRequestException(`Lesson has reached its maximum capacity of ${lessonEntity.maxStudents} students`);
    }

    // 3. Inscribir alumno (Prisma lanzará error si ya está inscrito por el @@unique)
    try {
      return await this.prisma.lessonEnrollment.create({
        data: {
          lessonId,
          studentId: enrollDto.studentId
        }
      });
    } catch (error) {
      // P2002 es el código de Prisma para violación de variable única (@@unique[lessonId, studentId])
      if (error.code === 'P2002') {
        throw new ConflictException('Student is already enrolled in this lesson');
      }
      throw error;
    }
  }

  async unenrollStudent(lessonId: string, studentId: string, schoolId: string) {
    const enrollment = await this.prisma.lessonEnrollment.findFirst({
      where: {
        lessonId,
        studentId,
        lesson: { schoolId } // Asegurar que el colegio de la lección es correcto
      }
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    return this.prisma.lessonEnrollment.delete({
      where: { id: enrollment.id }
    });
  }
}
