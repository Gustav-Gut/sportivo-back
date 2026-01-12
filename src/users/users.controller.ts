import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, UseInterceptors, UnauthorizedException } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header')
    const user = await this.usersService.create(createUserDto, schoolId);
    return new User(user)
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get()
  async findAll(@Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header')
    const users = await this.usersService.findAll(schoolId);
    return users.map((user: User) => new User(user))
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header')
    const user = await this.usersService.findOne(id, schoolId);
    return new User(user)
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header')
    const user = await this.usersService.update(id, updateUserDto, schoolId);
    return new User(user)
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-school-id') schoolId: string) {
    if (!schoolId) throw new UnauthorizedException('School ID is required header')
    const user = await this.usersService.remove(id, schoolId);
    return new User(user)
  }
}
