import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, UnauthorizedException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) { }

  @Roles(Role.ADMIN)
  @Post()
  create(
    @Body() createPlanDto: CreatePlanDto,
    @Headers('x-school-id') schoolId: string
  ) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.create(schoolId, createPlanDto);
  }

  @Roles(Role.ADMIN)
  findAll(
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.findAll(schoolId);
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-school-id') schoolId: string
  ) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.findOne(id, schoolId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
    @Headers('x-school-id') schoolId: string
  ) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.update(id, schoolId, updatePlanDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('x-school-id') schoolId: string
  ) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.remove(id, schoolId);
  }
}