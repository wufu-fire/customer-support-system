import type { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, AuthTokens } from './types/auth.types';
type AuthResponseBody = {
    user: AuthenticatedUser;
    tokens: AuthTokens;
};
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: Request, res: Response): Promise<AuthResponseBody>;
    login(dto: LoginDto, req: Request, res: Response): Promise<AuthResponseBody>;
    refresh(req: Request, res: Response): Promise<AuthResponseBody>;
    logout(req: Request, res: Response): Promise<void>;
    me(user: AuthenticatedUser): AuthenticatedUser;
    private sessionContext;
    private readRefreshCookie;
    private writeRefreshCookie;
    private clearRefreshCookie;
}
export {};
