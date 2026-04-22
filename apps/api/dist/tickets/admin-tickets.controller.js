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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTicketsController = void 0;
const common_1 = require("@nestjs/common");
const current_admin_user_id_decorator_1 = require("../auth/decorators/current-admin-user-id.decorator");
const admin_user_guard_1 = require("../auth/guards/admin-user.guard");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const update_ticket_status_dto_1 = require("./dto/update-ticket-status.dto");
const tickets_service_1 = require("./tickets.service");
let AdminTicketsController = class AdminTicketsController {
    ticketsService;
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }
    updateStatus(id, dto, adminUserId) {
        return this.ticketsService.updateStatus(id, dto, adminUserId);
    }
};
exports.AdminTicketsController = AdminTicketsController;
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_admin_user_id_decorator_1.CurrentAdminUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_ticket_status_dto_1.UpdateTicketStatusDto, String]),
    __metadata("design:returntype", void 0)
], AdminTicketsController.prototype, "updateStatus", null);
exports.AdminTicketsController = AdminTicketsController = __decorate([
    (0, common_1.Controller)('admin/tickets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_user_guard_1.AdminUserGuard),
    __metadata("design:paramtypes", [tickets_service_1.TicketsService])
], AdminTicketsController);
//# sourceMappingURL=admin-tickets.controller.js.map