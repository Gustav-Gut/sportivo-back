import { Injectable } from '@nestjs/common';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) { }

  create(schoolId: string, createPlanDto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        ...createPlanDto,
        school: {
          connect: {
            id: schoolId,
          },
        },
      },
    });
  }

  findAll(schoolId: string) {
    return this.prisma.plan.findMany({
      where: {
        active: true,
        schoolId
      },
    });
  }

  findOne(id: string, schoolId: string) {
    return this.prisma.plan.findFirst({
      where: {
        id,
        schoolId,
        active: true
      },
    });
  }

  async update(id: string, schoolId: string, updatePlanDto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, schoolId, active: true }
    });

    if (!plan) throw new Error("Plan not found");

    return this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async remove(id: string, schoolId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, schoolId, active: true }
    });

    if (!plan) throw new Error("Plan not found");

    return this.prisma.plan.update({
      where: { id },
      data: { active: false },
    });
  }
}