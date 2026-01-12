import { Injectable, ConflictException } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchoolsService {

  constructor(private prisma: PrismaService) { }

  async create(createSchoolDto: CreateSchoolDto) {
    const exists = await this.prisma.school.findUnique({
      where: { slug: createSchoolDto.slug }
    });

    if (exists) {
      throw new ConflictException('School with this slug already exists');
    }

    return this.prisma.school.create({
      data: createSchoolDto,
    });
  }

  findAll() {
    return this.prisma.school.findMany();
  }

  findOne(id: string) {
    return this.prisma.school.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.school.findUnique(
      {
        where: { slug },
        select: {
          id: true
        }
      }
    );
  }

  update(id: string, updateSchoolDto: UpdateSchoolDto) {
    return this.prisma.school.update({
      where: { id },
      data: updateSchoolDto,
    });
  }

  remove(id: string) {
    return this.prisma.school.update({
      where: { id },
      data: { active: false },
    });
  }
}
