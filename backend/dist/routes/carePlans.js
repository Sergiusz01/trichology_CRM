"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const pdfService_1 = require("../services/pdfService");
const auditService_1 = require("../services/auditService");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const carePlanSchema = zod_1.z.object({
    patientId: zod_1.z.string(),
    consultationId: zod_1.z.string().optional().nullable().transform(val => val === '' || !val ? undefined : val),
    title: zod_1.z.string().min(1, 'Tytuł jest wymagany'),
    totalDurationWeeks: zod_1.z.number().int().positive('Liczba tygodni musi być dodatnia'),
    notes: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
    weeks: zod_1.z.array(zod_1.z.object({
        weekNumber: zod_1.z.number().int().positive(),
        description: zod_1.z.string().optional().nullable(),
        washingRoutine: zod_1.z.string().optional().nullable(),
        topicalProducts: zod_1.z.string().optional().nullable(),
        supplements: zod_1.z.string().optional().nullable(),
        inClinicProcedures: zod_1.z.string().optional().nullable(),
        remarks: zod_1.z.string().optional().nullable(),
    })).optional(),
});
// Get care plans for a patient
router.get('/patient/:patientId', auth_1.authenticate, async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { active, archived = 'false' } = req.query;
        const isArchived = archived === 'true';
        const where = {
            patientId,
            isArchived,
        };
        if (active === 'true') {
            where.isActive = true;
        }
        const carePlans = await prisma.carePlan.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
                weeks: {
                    orderBy: { weekNumber: 'asc' },
                },
            },
        });
        res.json({ carePlans });
    }
    catch (error) {
        next(error);
    }
});
// Get care plan by ID
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const carePlan = await prisma.carePlan.findUnique({
            where: { id },
            include: {
                patient: true,
                consultation: {
                    select: { id: true, consultationDate: true },
                },
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
                weeks: {
                    orderBy: { weekNumber: 'asc' },
                },
            },
        });
        if (!carePlan) {
            return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
        }
        res.json({ carePlan });
    }
    catch (error) {
        next(error);
    }
});
// Create care plan
router.post('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const data = carePlanSchema.parse(req.body);
        const createdByUserId = req.user.id;
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: data.patientId },
        });
        if (!patient) {
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        // Verify consultation exists if provided
        let consultationId = data.consultationId;
        if (consultationId && consultationId.trim() !== '') {
            const consultation = await prisma.consultation.findUnique({
                where: { id: consultationId },
            });
            if (!consultation) {
                return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
            }
        }
        else {
            consultationId = undefined; // Set to undefined if empty string
        }
        const { weeks, consultationId: _, ...planData } = data;
        const carePlan = await prisma.carePlan.create({
            data: {
                ...planData,
                consultationId, // Use validated consultationId
                createdByUserId,
                weeks: weeks ? {
                    create: weeks,
                } : undefined,
            },
            include: {
                patient: true,
                createdBy: {
                    select: { id: true, name: true },
                },
                weeks: {
                    orderBy: { weekNumber: 'asc' },
                },
            },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'CREATE_CARE_PLAN',
            entity: 'CarePlan',
            entityId: carePlan.id,
        });
        res.status(201).json({ carePlan });
    }
    catch (error) {
        next(error);
    }
});
// Update care plan
router.put('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = carePlanSchema.omit({ patientId: true }).parse(req.body);
        const { weeks, ...planData } = data;
        // Update plan
        const carePlan = await prisma.carePlan.update({
            where: { id },
            data: planData,
        });
        // Update weeks if provided
        if (weeks) {
            // Delete existing weeks
            await prisma.carePlanWeek.deleteMany({
                where: { carePlanId: id },
            });
            // Create new weeks
            await prisma.carePlanWeek.createMany({
                data: weeks.map(week => ({
                    ...week,
                    carePlanId: id,
                })),
            });
        }
        const updatedPlan = await prisma.carePlan.findUnique({
            where: { id },
            include: {
                patient: true,
                createdBy: {
                    select: { id: true, name: true },
                },
                weeks: {
                    orderBy: { weekNumber: 'asc' },
                },
            },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'UPDATE_CARE_PLAN',
            entity: 'CarePlan',
            entityId: id,
        });
        res.json({ carePlan: updatedPlan });
    }
    catch (error) {
        next(error);
    }
});
// Archive care plan (soft delete)
router.delete('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const carePlan = await prisma.carePlan.update({
            where: { id },
            data: { isArchived: true },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'ARCHIVE_CARE_PLAN',
            entity: 'CarePlan',
            entityId: carePlan.id,
        });
        res.json({
            carePlan,
            message: 'Plan opieki został zarchiwizowany'
        });
    }
    catch (error) {
        next(error);
    }
});
// Restore archived care plan
router.post('/:id/restore', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const carePlan = await prisma.carePlan.findUnique({
            where: { id },
        });
        if (!carePlan) {
            return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
        }
        if (!carePlan.isArchived) {
            return res.status(400).json({ error: 'Plan opieki nie jest zarchiwizowany' });
        }
        const restoredCarePlan = await prisma.carePlan.update({
            where: { id },
            data: { isArchived: false },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'RESTORE_CARE_PLAN',
            entity: 'CarePlan',
            entityId: restoredCarePlan.id,
        });
        res.json({
            carePlan: restoredCarePlan,
            message: 'Plan opieki został przywrócony'
        });
    }
    catch (error) {
        next(error);
    }
});
// Permanently delete care plan (RODO/GDPR) - ADMIN only
router.delete('/:id/permanent', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const carePlan = await prisma.carePlan.findUnique({
            where: { id },
        });
        if (!carePlan) {
            return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
        }
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'PERMANENT_DELETE_CARE_PLAN',
            entity: 'CarePlan',
            entityId: id,
        });
        // Prisma will cascade delete:
        // - CarePlanWeek (onDelete: Cascade)
        // - EmailReminder (onDelete: SetNull - carePlanId will be set to null)
        // - EmailHistory (onDelete: SetNull - carePlanId will be set to null)
        await prisma.carePlan.delete({
            where: { id },
        });
        res.json({
            message: 'Plan opieki został trwale usunięty zgodnie z RODO',
            deleted: true
        });
    }
    catch (error) {
        next(error);
    }
});
// Generate PDF for care plan
router.get('/:id/pdf', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(`Generowanie PDF dla planu opieki ${id}...`);
        const carePlan = await prisma.carePlan.findUnique({
            where: { id },
            include: {
                patient: true,
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
                weeks: {
                    orderBy: { weekNumber: 'asc' },
                },
            },
        });
        if (!carePlan) {
            return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
        }
        const pdfBuffer = await (0, pdfService_1.generateCarePlanPDF)(carePlan);
        console.log(`PDF wygenerowany pomyślnie dla planu opieki ${id}, rozmiar: ${pdfBuffer.length} bajtów`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="plan-opieki-${id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Błąd w endpoint PDF planu opieki:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=carePlans.js.map