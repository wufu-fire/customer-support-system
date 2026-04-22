import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';
export declare class AdminTicketsController {
    private readonly ticketsService;
    constructor(ticketsService: TicketsService);
    updateStatus(id: string, dto: UpdateTicketStatusDto, adminUserId: string): Promise<{
        id: string;
        ticketNo: string;
        fromStatus: import("@prisma/client").TicketStatus;
        toStatus: import("@prisma/client").TicketStatus;
        updatedAt: Date;
    }>;
}
