import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentAdminUserId } from '../auth/decorators/current-admin-user-id.decorator';
import { AdminUserGuard } from '../auth/guards/admin-user.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

@Controller('admin/tickets')
@UseGuards(JwtAuthGuard, AdminUserGuard)
export class AdminTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentAdminUserId() adminUserId: string,
  ) {
    return this.ticketsService.updateStatus(id, dto, adminUserId);
  }
}
