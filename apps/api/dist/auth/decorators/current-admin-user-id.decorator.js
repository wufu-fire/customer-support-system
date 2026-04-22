"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentAdminUserId = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentAdminUserId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.adminUserId ?? '';
});
//# sourceMappingURL=current-admin-user-id.decorator.js.map