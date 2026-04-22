import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type {
  AuthenticatedUser,
  AuthTokens,
  LoginResult,
} from './types/auth.types';

type AuthResponseBody = {
  user: AuthenticatedUser;
  tokens: AuthTokens;
};

const REFRESH_COOKIE_NAME = 'css_refresh';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const result = await this.authService.register(dto, this.sessionContext(req));
    this.writeRefreshCookie(res, result);
    return { user: result.user, tokens: result.tokens };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const result = await this.authService.login(dto, this.sessionContext(req));
    this.writeRefreshCookie(res, result);
    return { user: result.user, tokens: result.tokens };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const cookie = this.readRefreshCookie(req);
    const result = await this.authService.refresh(
      cookie ?? '',
      this.sessionContext(req),
    );
    this.writeRefreshCookie(res, result);
    return { user: result.user, tokens: result.tokens };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookie = this.readRefreshCookie(req);
    await this.authService.logout(cookie);
    this.clearRefreshCookie(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private sessionContext(req: Request): {
    userAgent?: string | null;
    ip?: string | null;
  } {
    const userAgent = req.get('user-agent') ?? null;
    const forwardedFor = req.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.ip ?? null);
    return { userAgent, ip };
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> })
      .cookies;
    return cookies?.[REFRESH_COOKIE_NAME];
  }

  private writeRefreshCookie(res: Response, result: LoginResult): void {
    res.cookie(REFRESH_COOKIE_NAME, result.refreshCookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.refreshCookie.expiresAt,
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}
