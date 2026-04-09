import { TicketStatus } from '@prisma/client';
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
export declare class TicketsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateTicketDto): Promise<CreateTicketResult>;
    track(dto: TrackTicketDto): Promise<TrackTicketResult>;
    updateStatus(ticketId: string, dto: UpdateTicketStatusDto): Promise<UpdateTicketStatusResult>;
    private generateTicketNo;
}
export {};
