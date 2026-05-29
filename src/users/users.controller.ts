import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UnauthorizedException, Query } from '@nestjs/common';
import { CurrentSchoolId } from '../auth/decorators/current-school-id.decorator';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from './dto/users-query.dto';
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
    @CurrentSchoolId() schoolId: string) {
    const user = await this.usersService.create(createUserDto, schoolId);
    return new User(user)
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get()
  async findAll(
    @CurrentSchoolId() schoolId: string,
    @Query() query: UsersQueryDto,
  ) {
    const result = await this.usersService.findAll(schoolId, query, query.search, query.roles);
    return {
      ...result,
      data: result.data.map((user: any) => new User(user))
    };
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentSchoolId() schoolId: string) {
    const user = await this.usersService.findOne(id, schoolId);
    return new User(user)
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentSchoolId() schoolId: string) {
    const user = await this.usersService.update(id, updateUserDto, schoolId);
    return new User(user)
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(ClassSerializerInterceptor)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentSchoolId() schoolId: string) {
    const user = await this.usersService.remove(id, schoolId);
    return new User(user)
  }
}
