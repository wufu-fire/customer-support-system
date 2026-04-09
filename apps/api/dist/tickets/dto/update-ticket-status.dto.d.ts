import { TicketStatus } from '@prisma/client';
export declare class UpdateTicketStatusDto {
    toStatus: TicketStatus;
    comment?: string;
    changedByAdminId?: string;
}
