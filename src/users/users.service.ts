import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService) { }

  async create(createUserDto: CreateUserDto, schoolId: string) {
    const exists = await this.prisma.userWithoutPassword.user.findFirst({
      where: {
        schoolId,
        OR: [
          { email: createUserDto.email },
          { rut: createUserDto.rut }
        ]
      }
    });

    if (exists) {
      throw new ConflictException('User already exists in this school');
    }

    const rounds = Number(this.configService.get<number>('SALT_ROUNDS', 12));
    const hashedPassword = await hashPassword(createUserDto.password, rounds);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        schoolId,
        password: hashedPassword,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.userWithoutPassword.user.findMany({
      where: {
        active: true,
        schoolId,
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    return this.prisma.userWithoutPassword.user.findFirst({
      where: {
        id,
        schoolId,
        active: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto, schoolId: string) {
    return this.prisma.userWithoutPassword.user.update({
      where: {
        id,
        schoolId,
      },
      data: dto,
    });
  }

  async remove(id: string, schoolId: string) {
    return this.prisma.userWithoutPassword.user.update({
      where: {
        id,
        schoolId,
      },
      data: { active: false },
    });
  }
}

async function hashPassword(password: string, rounds: number): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(password, rounds);
    return hashedPassword;
  } catch (error) {
    console.error('Bcrypt Error:', error);
    throw new InternalServerErrorException('Error when hashing password: ' + (error instanceof Error ? error.message : String(error)));
  }
}