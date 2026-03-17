import { Controller, Post, Body, Get, Res, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  async login(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const { access_token } = await this.authService.login(body);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    return { success: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { success: true };
  }

  // Se usa el JwtAuthGuard para proteger esta ruta (no tiene @Public())
  @Get('check')
  checkAuth(@Req() req: Request) {
    // Si llega aquí, significa que el JwtStrategy validó la cookie y cargó req.user
    return { authenticated: true, user: req.user };
  }
}
