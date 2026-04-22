"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
const REFRESH_TOKEN_BYTES = 32;
const REFRESH_SESSION_DELIMITER = '.';
const GENERIC_CREDENTIAL_ERROR = 'Invalid email or password';
let AuthService = class AuthService {
    prisma;
    usersService;
    jwtService;
    accessTtlSeconds;
    refreshTtlSeconds;
    constructor(prisma, usersService, jwtService, config) {
        this.prisma = prisma;
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.accessTtlSeconds = this.parseTtl(config.get('JWT_ACCESS_TTL') ?? '900s', 900);
        this.refreshTtlSeconds = this.parseTtl(config.get('REFRESH_TTL') ?? '30d', 60 * 60 * 24 * 30);
    }
    async register(dto, ctx) {
        const passwordHash = await argon2.hash(dto.password, {
            type: argon2.argon2id,
        });
        let user;
        try {
            user = await this.usersService.create({
                email: dto.email,
                passwordHash,
                name: dto.name,
                locale: dto.locale,
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new common_1.ConflictException('Email is already registered');
            }
            throw error;
        }
        return this.issueSession(user, ctx);
    }
    async login(dto, ctx) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException(GENERIC_CREDENTIAL_ERROR);
        }
        const matched = await argon2.verify(user.passwordHash, dto.password);
        if (!matched) {
            throw new common_1.UnauthorizedException(GENERIC_CREDENTIAL_ERROR);
        }
        await this.usersService.touchLastLogin(user.id);
        return this.issueSession(user, ctx);
    }
    async refresh(rawCookieValue, ctx) {
        const parsed = this.parseRefreshCookie(rawCookieValue);
        if (!parsed) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const session = await this.prisma.authSession.findUnique({
            where: { id: parsed.sessionId },
            include: { user: true },
        });
        if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (this.hashRefreshToken(parsed.rawToken) !== session.refreshTokenHash) {
            await this.prisma.authSession.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (session.user.status !== 'active') {
            throw new common_1.UnauthorizedException('User is disabled');
        }
        await this.prisma.authSession.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
        });
        return this.issueSession(session.user, ctx);
    }
    async logout(rawCookieValue) {
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
    getRefreshTtlSeconds() {
        return this.refreshTtlSeconds;
    }
    toAuthenticatedUser(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            locale: user.locale,
            emailVerifiedAt: user.emailVerifiedAt,
        };
    }
    async issueSession(user, ctx) {
        const rawToken = (0, node_crypto_1.randomBytes)(REFRESH_TOKEN_BYTES).toString('base64url');
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
    async signAccessToken(user) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: this.accessTtlSeconds,
        });
        return { accessToken, expiresIn: this.accessTtlSeconds };
    }
    hashRefreshToken(rawToken) {
        return (0, node_crypto_1.createHash)('sha256').update(rawToken).digest('hex');
    }
    parseRefreshCookie(cookieValue) {
        if (typeof cookieValue !== 'string' || cookieValue.length === 0) {
            return null;
        }
        const index = cookieValue.indexOf(REFRESH_SESSION_DELIMITER);
        if (index <= 0 || index === cookieValue.length - 1) {
            return null;
        }
        const sessionId = cookieValue.slice(0, index);
        const rawToken = cookieValue.slice(index + 1);
        if (!/^[0-9a-f-]{36}$/i.test(sessionId) ||
            rawToken.length < 16 ||
            rawToken.length > 256) {
            return null;
        }
        return { sessionId, rawToken };
    }
    truncate(value, max) {
        if (!value) {
            return null;
        }
        return value.length > max ? value.slice(0, max) : value;
    }
    parseTtl(raw, fallbackSeconds) {
        const match = raw.trim().match(/^(\d+)([smhd])?$/i);
        if (!match) {
            return fallbackSeconds;
        }
        const value = Number(match[1]);
        const unit = (match[2] ?? 's').toLowerCase();
        const multipliers = {
            s: 1,
            m: 60,
            h: 60 * 60,
            d: 60 * 60 * 24,
        };
        return value * (multipliers[unit] ?? 1);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map