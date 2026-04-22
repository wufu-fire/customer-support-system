"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const allowedTransitions = {
    [client_1.TicketStatus.submitted]: [client_1.TicketStatus.accepted, client_1.TicketStatus.closed],
    [client_1.TicketStatus.accepted]: [client_1.TicketStatus.in_progress, client_1.TicketStatus.closed],
    [client_1.TicketStatus.in_progress]: [client_1.TicketStatus.resolved, client_1.TicketStatus.closed],
    [client_1.TicketStatus.resolved]: [client_1.TicketStatus.closed],
    [client_1.TicketStatus.closed]: [],
};
let TicketsService = class TicketsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        if (dto.productId) {
            const existingProduct = await this.prisma.product.findUnique({
                where: { id: dto.productId },
                select: { id: true },
            });
            if (!existingProduct) {
                throw new common_1.BadRequestException('Invalid productId');
            }
        }
        for (let attempt = 0; attempt < 5; attempt++) {
            const ticketNo = this.generateTicketNo();
            try {
                return await this.prisma.$transaction(async (tx) => {
                    const created = await tx.ticket.create({
                        data: {
                            ticketNo,
                            status: client_1.TicketStatus.submitted,
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
                            toStatus: client_1.TicketStatus.submitted,
                            comment: 'ticket created',
                        },
                    });
                    return {
                        ticketNo: created.ticketNo,
                        status: created.status,
                        createdAt: created.createdAt,
                    };
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002') {
                    const target = Array.isArray(error.meta?.target)
                        ? error.meta?.target
                        : [];
                    if (target.includes('ticket_no') || target.includes('ticketNo')) {
                        continue;
                    }
                    throw new common_1.ConflictException('Unique constraint violation');
                }
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    (error.code === 'P2003' || error.code === 'P2025')) {
                    throw new common_1.BadRequestException('Invalid relation reference');
                }
                throw error;
            }
        }
        throw new common_1.InternalServerErrorException('Unable to create ticket due to ID generation conflict');
    }
    async track(dto) {
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
            throw new common_1.NotFoundException('Unable to find a matching ticket. Please check ticket number and email.');
        }
        return {
            ticketNo: ticket.ticketNo,
            status: ticket.status,
            updatedAt: ticket.updatedAt,
            latestPublicReply: ticket.latestPublicReply,
        };
    }
    async updateStatus(ticketId, dto, changedByAdminId) {
        const admin = await this.prisma.adminUser.findUnique({
            where: { id: changedByAdminId },
            select: { id: true },
        });
        if (!admin) {
            throw new common_1.BadRequestException('Invalid changedByAdminId');
        }
        const toStatus = dto.toStatus;
        let updated;
        try {
            updated = await this.prisma.$transaction(async (tx) => {
                const ticket = await tx.ticket.findUnique({
                    where: { id: ticketId },
                    select: { id: true, ticketNo: true, status: true },
                });
                if (!ticket) {
                    throw new common_1.NotFoundException('Ticket not found');
                }
                const fromStatus = ticket.status;
                if (fromStatus === toStatus) {
                    throw new common_1.BadRequestException('Status is already set to target value');
                }
                if (!allowedTransitions[fromStatus].includes(toStatus)) {
                    throw new common_1.BadRequestException(`Invalid status transition: ${fromStatus} -> ${toStatus}`);
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
                    throw new common_1.ConflictException('Ticket status was updated by another request. Please retry.');
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
                    throw new common_1.NotFoundException('Ticket not found after status update');
                }
                await tx.ticketStatusHistory.create({
                    data: {
                        ticketId: ticket.id,
                        fromStatus,
                        toStatus,
                        changedByAdminId,
                        comment: dto.comment?.trim() || null,
                    },
                });
                return {
                    changed,
                    fromStatus,
                };
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2003') {
                throw new common_1.BadRequestException('Invalid changedByAdminId');
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
    generateTicketNo() {
        const date = new Date();
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        const suffix = (0, node_crypto_1.randomBytes)(3).toString('hex').toUpperCase();
        return `T${y}${m}${d}${suffix}`;
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map