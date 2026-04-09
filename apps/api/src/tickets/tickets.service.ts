import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TrackTicketDto } from './dto/track-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

type CreateTicketResult = {
  ticketNo: string;
  status: TicketStatus;
  createdAt: Date;
};

type TrackTicketResult = {
  ticketNo: string;
  status: TicketStatus;
  updatedAt: Date;
  latestPublicReply: string | null;
};

type UpdateTicketStatusResult = {
  id: string;
  ticketNo: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  updatedAt: Date;
};

const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.submitted]: [TicketStatus.accepted, TicketStatus.closed],
  [TicketStatus.accepted]: [TicketStatus.in_progress, TicketStatus.closed],
  [TicketStatus.in_progress]: [TicketStatus.resolved, TicketStatus.closed],
  [TicketStatus.resolved]: [TicketStatus.closed],
  [TicketStatus.closed]: [],
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto): Promise<CreateTicketResult> {
    if (dto.productId) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { id: true },
      });
      if (!existingProduct) {
        throw new BadRequestException('Invalid productId');
      }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const ticketNo = this.generateTicketNo();
      try {
        return await this.prisma.$transaction(async (tx) => {
          const created = await tx.ticket.create({
            data: {
              ticketNo,
              status: TicketStatus.submitted,
              issueType: dto.issueType.trim(),
              issueDescription: dto.issueDescription.trim(),
              customerName: dto.customerName.trim(),
              customerEmail: dto.customerEmail.trim().toLowerCase(),
              customerPhone: dto.customerPhone?.trim() || null,
              orderRefNo: dto.orderRefNo?.trim() || null,
              productId: dto.productId?.trim() || null,
              productNameSnapshot: dto.productName.trim(),
            },
          });

          await tx.ticketStatusHistory.create({
            data: {
              ticketId: created.id,
              fromStatus: null,
              toStatus: TicketStatus.submitted,
              comment: 'ticket created',
            },
          });

          return {
            ticketNo: created.ticketNo,
            status: created.status,
            createdAt: created.createdAt,
          };
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = Array.isArray(error.meta?.target)
            ? (error.meta?.target as string[])
            : [];
          if (target.includes('ticket_no') || target.includes('ticketNo')) {
            continue;
          }
          throw new ConflictException('Unique constraint violation');
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2003' || error.code === 'P2025')
        ) {
          throw new BadRequestException('Invalid relation reference');
        }
        throw error;
      }
    }

    throw new InternalServerErrorException(
      'Unable to create ticket due to ID generation conflict',
    );
  }

  async track(dto: TrackTicketDto): Promise<TrackTicketResult> {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        ticketNo: dto.ticketNo.toUpperCase(),
        customerEmail: dto.email.toLowerCase(),
      },
      select: {
        ticketNo: true,
        status: true,
        updatedAt: true,
        latestPublicReply: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        'Unable to find a matching ticket. Please check ticket number and email.',
      );
    }

    return {
      ticketNo: ticket.ticketNo,
      status: ticket.status,
      updatedAt: ticket.updatedAt,
      latestPublicReply: ticket.latestPublicReply,
    };
  }

  async updateStatus(
    ticketId: string,
    dto: UpdateTicketStatusDto,
  ): Promise<UpdateTicketStatusResult> {
    if (dto.changedByAdminId) {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: dto.changedByAdminId },
        select: { id: true },
      });
      if (!admin) {
        throw new BadRequestException('Invalid changedByAdminId');
      }
    }

    const toStatus = dto.toStatus;

    let updated: {
      changed: {
        id: string;
        ticketNo: string;
        status: TicketStatus;
        updatedAt: Date;
      };
      fromStatus: TicketStatus;
    };
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: { id: true, ticketNo: true, status: true },
        });

        if (!ticket) {
          throw new NotFoundException('Ticket not found');
        }

        const fromStatus = ticket.status;

        if (fromStatus === toStatus) {
          throw new BadRequestException(
            'Status is already set to target value',
          );
        }

        if (!allowedTransitions[fromStatus].includes(toStatus)) {
          throw new BadRequestException(
            `Invalid status transition: ${fromStatus} -> ${toStatus}`,
          );
        }

        const result = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            status: fromStatus,
          },
          data: {
            status: toStatus,
          },
        });

        if (result.count === 0) {
          throw new ConflictException(
            'Ticket status was updated by another request. Please retry.',
          );
        }

        const changed = await tx.ticket.findUnique({
          where: { id: ticket.id },
          select: {
            id: true,
            ticketNo: true,
            status: true,
            updatedAt: true,
          },
        });

        if (!changed) {
          throw new NotFoundException('Ticket not found after status update');
        }

        await tx.ticketStatusHistory.create({
          data: {
            ticketId: ticket.id,
            fromStatus,
            toStatus,
            changedByAdminId: dto.changedByAdminId ?? null,
            comment: dto.comment?.trim() || null,
          },
        });

        return {
          changed,
          fromStatus,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('Invalid changedByAdminId');
      }
      throw error;
    }

    return {
      id: updated.changed.id,
      ticketNo: updated.changed.ticketNo,
      fromStatus: updated.fromStatus,
      toStatus: updated.changed.status,
      updatedAt: updated.changed.updatedAt,
    };
  }

  private generateTicketNo(): string {
    const date = new Date();
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `T${y}${m}${d}${suffix}`;
  }
}
