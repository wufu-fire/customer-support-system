import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AuthenticatedUser,
  AuthTokens,
  JwtPayload,
  LoginResult,
} from './types/auth.types';

const REFRESH_TOKEN_BYTES = 32;
const REFRESH_SESSION_DELIMITER = '.';
const GENERIC_CREDENTIAL_ERROR = 'Invalid email or password';

type SessionContext = {
  userAgent?: string | null;
  ip?: string | null;
};

@Injectable()
export class AuthService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.accessTtlSeconds = this.parseTtl(
      config.get<string>('JWT_ACCESS_TTL') ?? '900s',
      900,
    );
    this.refreshTtlSeconds = this.parseTtl(
      config.get<string>('REFRESH_TTL') ?? '30d',
      60 * 60 * 24 * 30,
    );
  }

  async register(dto: RegisterDto, ctx: SessionContext): Promise<LoginResult> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    let user: User;
    try {
      user = await this.usersService.create({
        email: dto.email,
        passwordHash,
        name: dto.name,
        locale: dto.locale,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }

    return this.issueSession(user, ctx);
  }

  async login(dto: LoginDto, ctx: SessionContext): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException(GENERIC_CREDENTIAL_ERROR);
    }
    const matched = await argon2.verify(user.passwordHash, dto.password);
    if (!matched) {
      throw new UnauthorizedException(GENERIC_CREDENTIAL_ERROR);
    }

    await this.usersService.touchLastLogin(user.id);
    return this.issueSession(user, ctx);
  }

  async refresh(
    rawCookieValue: string,
    ctx: SessionContext,
  ): Promise<LoginResult> {
    const parsed = this.parseRefreshCookie(rawCookieValue);
    if (!parsed) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.prisma.authSession.findUnique({
      where: { id: parsed.sessionId },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (this.hashRefreshToken(parsed.rawToken) !== session.refreshTokenHash) {
      // Suspicious reuse: revoke the session.
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (session.user.status !== 'active') {
      throw new UnauthorizedException('User is disabled');
    }

    // Rotate: revoke the existing session and mint a new one.
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(session.user, ctx);
  }

  async logout(rawCookieValue: string | undefined): Promise<void> {
    if (!rawCookieValue) {
      return;
    }
    const parsed = this.parseRefreshCookie(rawCookieValue);
    if (!parsed) {
      return;
    }
    await this.prisma.authSession
      .updateMany({
        where: { id: parsed.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  getRefreshTtlSeconds(): number {
    return this.refreshTtlSeconds;
  }

  toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  private async issueSession(
    user: User,
    ctx: SessionContext,
  ): Promise<LoginResult> {
    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const refreshTokenHash = this.hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent: this.truncate(ctx.userAgent ?? null, 255),
        ip: this.truncate(ctx.ip ?? null, 64),
        expiresAt,
      },
      select: { id: true },
    });

    const tokens = await this.signAccessToken(user);
    const cookieValue = `${session.id}${REFRESH_SESSION_DELIMITER}${rawToken}`;

    return {
      user: this.toAuthenticatedUser(user),
      tokens,
      refreshCookie: { value: cookieValue, expiresAt },
    };
  }

  private async signAccessToken(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTtlSeconds,
    });
    return { accessToken, expiresIn: this.accessTtlSeconds };
  }

  private hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private parseRefreshCookie(
    cookieValue: string,
  ): { sessionId: string; rawToken: string } | null {
    if (typeof cookieValue !== 'string' || cookieValue.length === 0) {
      return null;
    }
    const index = cookieValue.indexOf(REFRESH_SESSION_DELIMITER);
    if (index <= 0 || index === cookieValue.length - 1) {
      return null;
    }
    const sessionId = cookieValue.slice(0, index);
    const rawToken = cookieValue.slice(index + 1);
    if (
      !/^[0-9a-f-]{36}$/i.test(sessionId) ||
      rawToken.length < 16 ||
      rawToken.length > 256
    ) {
      return null;
    }
    return { sessionId, rawToken };
  }

  private truncate(value: string | null, max: number): string | null {
    if (!value) {
      return null;
    }
    return value.length > max ? value.slice(0, max) : value;
  }

  private parseTtl(raw: string, fallbackSeconds: number): number {
    const match = raw.trim().match(/^(\d+)([smhd])?$/i);
    if (!match) {
      return fallbackSeconds;
    }
    const value = Number(match[1]);
    const unit = (match[2] ?? 's').toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24,
    };
    return value * (multipliers[unit] ?? 1);
  }
}
