import { Injectable } from '@nestjs/common';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) { }

  create(createPlanDto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: createPlanDto,
    });
  }

  findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
    });
  }

  findOne(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
    });
  }

  update(id: string, updatePlanDto: UpdatePlanDto) {
    return this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  remove(id: string) {
    return this.prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
  }
}