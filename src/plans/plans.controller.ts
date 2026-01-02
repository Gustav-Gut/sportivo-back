import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, UnauthorizedException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) { }

  @Post()
  create(
    @Body() createPlanDto: CreatePlanDto,
    @Headers('x-school-id') schoolId: string
  ) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.create(schoolId, createPlanDto);
  }
  @Get()
  findAll(@Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.findAll(schoolId);
  }
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-school-id') schoolId: string
  ) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.findOne(id, schoolId);
  }
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
    @Headers('x-school-id') schoolId: string
  ) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.update(id, schoolId, updatePlanDto);
  }
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('x-school-id') schoolId: string
  ) {
    if (!schoolId) throw new UnauthorizedException('School ID is required');
    return this.plansService.remove(id, schoolId);
  }
}