import { Module } from '@nestjs/common';
import { AdminUserGuard } from '../auth/guards/admin-user.guard';
import { AdminTicketsController } from './admin-tickets.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, AdminTicketsController],
  providers: [TicketsService, AdminUserGuard],
})
export class TicketsModule {}
