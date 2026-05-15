import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class AdminEnrollmentDto {
  @IsString()
  planId: string;

  @IsBoolean()
  isAdult: boolean;

  @IsString()
  studentRut: string;

  @IsString()
  studentFirstName: string;

  @IsString()
  studentLastName: string;

  @IsEmail()
  studentEmail: string;

  @IsString()
  @IsOptional()
  studentPhone?: string;

  // Tutor fields (required if not adult)
  @IsString()
  @IsOptional()
  tutorRut?: string;

  @IsString()
  @IsOptional()
  tutorFirstName?: string;

  @IsString()
  @IsOptional()
  tutorLastName?: string;

  @IsEmail()
  @IsOptional()
  tutorEmail?: string;

  @IsString()
  @IsOptional()
  tutorPhone?: string;

  @IsString()
  @IsOptional()
  relationType?: string;
}
