import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/auth.types';

type AdminRequest = Request & {
  user?: AuthenticatedUser;
  adminUserId?: string;
};

@Injectable()
export class AdminUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('User context missing');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      throw new ForbiddenException('Admin permission required');
    }

    request.adminUserId = admin.id;
    return true;
  }
}
