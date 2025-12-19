import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePlanDto } from './create-plan.dto';

export class UpdatePlanDto extends PartialType(
    OmitType(CreatePlanDto, ['price', 'durationMonths'] as const),
) { }