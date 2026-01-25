import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

type AuditInput = {
  action: string;
  entity: string;
  entityId?: string;
};

export async function writeAuditLog(req: AuthRequest, input: AuditInput) {
  try {
    if (!req.user?.id) return;
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: (req.headers['x-forwarded-for'] as string | undefined) || req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      },
    });
  } catch (e: any) {
    // Never fail the request because of audit logging
    logger.warn('Audit log write failed', { errorName: e?.name });
  }
}



