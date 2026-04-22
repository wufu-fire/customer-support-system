import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

type AdminRequest = Request & {
  adminUserId?: string;
};

export const CurrentAdminUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AdminRequest>();
    return request.adminUserId ?? '';
  },
);
