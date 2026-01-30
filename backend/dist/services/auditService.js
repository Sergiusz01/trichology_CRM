"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const prisma_1 = require("../prisma");
const logger_1 = require("../utils/logger");
async function writeAuditLog(req, input) {
    try {
        if (!req.user?.id)
            return;
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: input.action,
                entity: input.entity,
                entityId: input.entityId,
                method: req.method,
                path: req.originalUrl || req.path,
                ip: req.headers['x-forwarded-for'] || req.ip,
                userAgent: req.headers['user-agent'],
            },
        });
    }
    catch (e) {
        // Never fail the request because of audit logging
        logger_1.logger.warn('Audit log write failed', { errorName: e?.name });
    }
}
//# sourceMappingURL=auditService.js.map