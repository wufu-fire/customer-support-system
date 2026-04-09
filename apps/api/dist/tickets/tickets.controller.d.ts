import { CreateTicketDto } from './dto/create-ticket.dto';
import { TrackTicketDto } from './dto/track-ticket.dto';
import { TicketsService } from './tickets.service';
export declare class TicketsController {
    private readonly ticketsService;
    constructor(ticketsService: TicketsService);
    create(dto: CreateTicketDto): Promise<{
        ticketNo: string;
        status: import("@prisma/client").TicketStatus;
        createdAt: Date;
    }>;
    track(dto: TrackTicketDto): Promise<{
        ticketNo: string;
        status: import("@prisma/client").TicketStatus;
        updatedAt: Date;
        latestPublicReply: string | null;
    }>;
}
