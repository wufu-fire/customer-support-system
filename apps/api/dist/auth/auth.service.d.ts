import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser, LoginResult } from './types/auth.types';
type SessionContext = {
    userAgent?: string | null;
    ip?: string | null;
};
export declare class AuthService {
    private readonly prisma;
    private readonly usersService;
    private readonly jwtService;
    private readonly accessTtlSeconds;
    private readonly refreshTtlSeconds;
    constructor(prisma: PrismaService, usersService: UsersService, jwtService: JwtService, config: ConfigService);
    register(dto: RegisterDto, ctx: SessionContext): Promise<LoginResult>;
    login(dto: LoginDto, ctx: SessionContext): Promise<LoginResult>;
    refresh(rawCookieValue: string, ctx: SessionContext): Promise<LoginResult>;
    logout(rawCookieValue: string | undefined): Promise<void>;
    getRefreshTtlSeconds(): number;
    toAuthenticatedUser(user: User): AuthenticatedUser;
    private issueSession;
    private signAccessToken;
    private hashRefreshToken;
    private parseRefreshCookie;
    private truncate;
    private parseTtl;
}
export {};
