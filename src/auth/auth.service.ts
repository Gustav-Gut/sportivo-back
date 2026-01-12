import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private schoolsService: SchoolsService,
    private jwtService: JwtService
  ) { }

  async #validateUser(email: string, pass: string, schoolSlug: string): Promise<any> {
    const school = await this.schoolsService.findBySlug(schoolSlug);
    if (!school) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.usersService.findByEmail(email, school.id);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(body: any) {
    const user = await this.#validateUser(body.email, body.password, body.schoolSlug);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      schoolId: user.schoolId,
      role: user.role
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}