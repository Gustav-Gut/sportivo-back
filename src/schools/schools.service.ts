import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class SchoolsService {

  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService
  ) { }

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

  async uploadLogo(id: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.uploadService.uploadImage(file, `clubit/schools/${id}`);

    return this.prisma.school.update({
      where: { id },
      data: { logoUrl: result.secure_url },
    });
  }

  remove(id: string) {
    return this.prisma.school.update({
      where: { id },
      data: { active: false },
    });
  }
}
