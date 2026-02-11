import { AuthRequest } from '../middleware/auth';
type AuditInput = {
    action: string;
    entity: string;
    entityId?: string;
};
export declare function writeAuditLog(req: AuthRequest, input: AuditInput): Promise<void>;
export {};
//# sourceMappingURL=auditService.d.ts.map