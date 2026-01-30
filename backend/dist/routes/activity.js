"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
const ACTION_LABELS = {
    LOGIN: 'Zalogowano',
    CREATE_PATIENT: 'Dodano pacjenta',
    UPDATE_PATIENT: 'Zaktualizowano pacjenta',
    ARCHIVE_PATIENT: 'Zarchiwizowano pacjenta',
    RESTORE_PATIENT: 'Przywrócono pacjenta',
    DELETE_PATIENT: 'Usunięto pacjenta (trwale)',
    CREATE_VISIT: 'Dodano wizytę',
    UPDATE_VISIT: 'Zaktualizowano wizytę',
    UPDATE_VISIT_STATUS: 'Zmieniono status wizyty',
    DELETE_VISIT: 'Usunięto wizytę',
    CREATE_CONSULTATION: 'Dodano konsultację',
    UPDATE_CONSULTATION: 'Zaktualizowano konsultację',
    ARCHIVE_CONSULTATION: 'Zarchiwizowano konsultację',
    RESTORE_CONSULTATION: 'Przywrócono konsultację',
    DELETE_CONSULTATION: 'Usunięto konsultację (trwale)',
    CREATE_LAB_RESULT: 'Dodano wynik badań',
    UPDATE_LAB_RESULT: 'Zaktualizowano wynik badań',
    ARCHIVE_LAB_RESULT: 'Zarchiwizowano wynik badań',
    RESTORE_LAB_RESULT: 'Przywrócono wynik badań',
    DELETE_LAB_RESULT: 'Usunięto wynik badań (trwale)',
    CREATE_CARE_PLAN: 'Dodano plan opieki',
    UPDATE_CARE_PLAN: 'Zaktualizowano plan opieki',
    ARCHIVE_CARE_PLAN: 'Zarchiwizowano plan opieki',
    RESTORE_CARE_PLAN: 'Przywrócono plan opieki',
    DELETE_CARE_PLAN: 'Usunięto plan opieki (trwale)',
};
function getLink(entity, entityId, maps) {
    if (!entityId)
        return '';
    if (entity === 'Patient')
        return `/patients/${entityId}`;
    if (entity === 'Visit') {
        const pid = maps?.visitPatient?.get(entityId);
        return pid ? `/patients/${pid}` : '/visits';
    }
    if (entity === 'User')
        return '/profile';
    if (entity === 'Consultation')
        return `/consultations/${entityId}`;
    if (entity === 'LabResult') {
        const pid = maps?.labPatient?.get(entityId);
        return pid ? `/patients/${pid}/lab-results` : '';
    }
    if (entity === 'CarePlan') {
        const pid = maps?.carePlanPatient?.get(entityId);
        return pid ? `/patients/${pid}/care-plans` : '';
    }
    return '';
}
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(1, Number(req.query.limit) || 1000), 2000);
        const logs = await prisma_1.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        const visitIds = Array.from(new Set(logs.filter((l) => l.entity === 'Visit' && l.entityId).map((l) => l.entityId)));
        const labIds = Array.from(new Set(logs.filter((l) => l.entity === 'LabResult' && l.entityId).map((l) => l.entityId)));
        const carePlanIds = Array.from(new Set(logs.filter((l) => l.entity === 'CarePlan' && l.entityId).map((l) => l.entityId)));
        const [visits, labResults, carePlans] = await Promise.all([
            visitIds.length
                ? prisma_1.prisma.visit.findMany({
                    where: { id: { in: visitIds } },
                    select: { id: true, patientId: true },
                })
                : [],
            labIds.length
                ? prisma_1.prisma.labResult.findMany({
                    where: { id: { in: labIds } },
                    select: { id: true, patientId: true },
                })
                : [],
            carePlanIds.length
                ? prisma_1.prisma.carePlan.findMany({
                    where: { id: { in: carePlanIds } },
                    select: { id: true, patientId: true },
                })
                : [],
        ]);
        const visitPatientMap = new Map(visits.map((v) => [v.id, v.patientId]));
        const labPatientMap = new Map(labResults.map((r) => [r.id, r.patientId]));
        const carePlanPatientMap = new Map(carePlans.map((c) => [c.id, c.patientId]));
        const maps = {
            visitPatient: visitPatientMap,
            labPatient: labPatientMap,
            carePlanPatient: carePlanPatientMap,
        };
        const activities = logs.map((log) => {
            const title = ACTION_LABELS[log.action] || log.action;
            const userName = log.user ? `${log.user.name} (${log.user.email})` : '—';
            const dateStr = log.createdAt.toISOString();
            const link = getLink(log.entity, log.entityId, maps);
            return {
                id: log.id,
                type: log.action,
                title,
                subtitle: userName,
                date: dateStr,
                link,
                userName: log.user?.name ?? '—',
                userEmail: log.user?.email ?? '—',
                entity: log.entity,
                entityId: log.entityId,
                ip: log.ip ?? null,
                userAgent: log.userAgent ?? null,
            };
        });
        res.json({ activities });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=activity.js.map