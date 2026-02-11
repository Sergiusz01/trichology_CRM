"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const labResults_1 = require("../utils/labResults");
const pdfService_1 = require("../services/pdfService");
const auditService_1 = require("../services/auditService");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const labResultSchema = zod_1.z.object({
    patientId: zod_1.z.string(),
    consultationId: zod_1.z.string().optional(),
    date: zod_1.z.string().datetime().optional(),
    // Morphology
    hgb: zod_1.z.number().optional(),
    hgbUnit: zod_1.z.string().optional(),
    hgbRefLow: zod_1.z.number().optional(),
    hgbRefHigh: zod_1.z.number().optional(),
    rbc: zod_1.z.number().optional(),
    rbcUnit: zod_1.z.string().optional(),
    rbcRefLow: zod_1.z.number().optional(),
    rbcRefHigh: zod_1.z.number().optional(),
    wbc: zod_1.z.number().optional(),
    wbcUnit: zod_1.z.string().optional(),
    wbcRefLow: zod_1.z.number().optional(),
    wbcRefHigh: zod_1.z.number().optional(),
    plt: zod_1.z.number().optional(),
    pltUnit: zod_1.z.string().optional(),
    pltRefLow: zod_1.z.number().optional(),
    pltRefHigh: zod_1.z.number().optional(),
    // Inflammatory
    crp: zod_1.z.number().optional(),
    crpUnit: zod_1.z.string().optional(),
    crpRefLow: zod_1.z.number().optional(),
    crpRefHigh: zod_1.z.number().optional(),
    // Iron
    iron: zod_1.z.number().optional(),
    ironUnit: zod_1.z.string().optional(),
    ironRefLow: zod_1.z.number().optional(),
    ironRefHigh: zod_1.z.number().optional(),
    ferritin: zod_1.z.number().optional(),
    ferritinUnit: zod_1.z.string().optional(),
    ferritinRefLow: zod_1.z.number().optional(),
    ferritinRefHigh: zod_1.z.number().optional(),
    // Vitamins
    vitaminD3: zod_1.z.number().optional(),
    vitaminD3Unit: zod_1.z.string().optional(),
    vitaminD3RefLow: zod_1.z.number().optional(),
    vitaminD3RefHigh: zod_1.z.number().optional(),
    vitaminB12: zod_1.z.number().optional(),
    vitaminB12Unit: zod_1.z.string().optional(),
    vitaminB12RefLow: zod_1.z.number().optional(),
    vitaminB12RefHigh: zod_1.z.number().optional(),
    folicAcid: zod_1.z.number().optional(),
    folicAcidUnit: zod_1.z.string().optional(),
    folicAcidRefLow: zod_1.z.number().optional(),
    folicAcidRefHigh: zod_1.z.number().optional(),
    // Thyroid
    tsh: zod_1.z.number().optional(),
    tshUnit: zod_1.z.string().optional(),
    tshRefLow: zod_1.z.number().optional(),
    tshRefHigh: zod_1.z.number().optional(),
    ft3: zod_1.z.number().optional(),
    ft3Unit: zod_1.z.string().optional(),
    ft3RefLow: zod_1.z.number().optional(),
    ft3RefHigh: zod_1.z.number().optional(),
    ft4: zod_1.z.number().optional(),
    ft4Unit: zod_1.z.string().optional(),
    ft4RefLow: zod_1.z.number().optional(),
    ft4RefHigh: zod_1.z.number().optional(),
    antiTPO: zod_1.z.number().optional(),
    antiTPOUnit: zod_1.z.string().optional(),
    antiTPORefLow: zod_1.z.number().optional(),
    antiTPORefHigh: zod_1.z.number().optional(),
    antiTG: zod_1.z.number().optional(),
    antiTGUnit: zod_1.z.string().optional(),
    antiTGRefLow: zod_1.z.number().optional(),
    antiTGRefHigh: zod_1.z.number().optional(),
    trab: zod_1.z.number().optional(),
    trabUnit: zod_1.z.string().optional(),
    trabRefLow: zod_1.z.number().optional(),
    trabRefHigh: zod_1.z.number().optional(),
    // Hormones
    estrogen: zod_1.z.number().optional(),
    estrogenUnit: zod_1.z.string().optional(),
    estrogenRefLow: zod_1.z.number().optional(),
    estrogenRefHigh: zod_1.z.number().optional(),
    progesterone: zod_1.z.number().optional(),
    progesteroneUnit: zod_1.z.string().optional(),
    progesteroneRefLow: zod_1.z.number().optional(),
    progesteroneRefHigh: zod_1.z.number().optional(),
    testosterone: zod_1.z.number().optional(),
    testosteroneUnit: zod_1.z.string().optional(),
    testosteroneRefLow: zod_1.z.number().optional(),
    testosteroneRefHigh: zod_1.z.number().optional(),
    dheas: zod_1.z.number().optional(),
    dheasUnit: zod_1.z.string().optional(),
    dheasRefLow: zod_1.z.number().optional(),
    dheasRefHigh: zod_1.z.number().optional(),
    prolactin: zod_1.z.number().optional(),
    prolactinUnit: zod_1.z.string().optional(),
    prolactinRefLow: zod_1.z.number().optional(),
    prolactinRefHigh: zod_1.z.number().optional(),
    // Glucose/Insulin
    glucose: zod_1.z.number().optional(),
    glucoseUnit: zod_1.z.string().optional(),
    glucoseRefLow: zod_1.z.number().optional(),
    glucoseRefHigh: zod_1.z.number().optional(),
    insulin: zod_1.z.number().optional(),
    insulinUnit: zod_1.z.string().optional(),
    insulinRefLow: zod_1.z.number().optional(),
    insulinRefHigh: zod_1.z.number().optional(),
    homaIR: zod_1.z.number().optional(),
    homaIRRefLow: zod_1.z.number().optional(),
    homaIRRefHigh: zod_1.z.number().optional(),
    hba1c: zod_1.z.number().optional(),
    hba1cUnit: zod_1.z.string().optional(),
    hba1cRefLow: zod_1.z.number().optional(),
    hba1cRefHigh: zod_1.z.number().optional(),
    notes: zod_1.z.string().optional(),
});
// Get lab results for a patient
router.get('/patient/:patientId', auth_1.authenticate, async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { archived = 'false' } = req.query;
        const isArchived = archived === 'true';
        const labResults = await prisma.labResult.findMany({
            where: {
                patientId,
                isArchived,
            },
            orderBy: { date: 'desc' },
            include: {
                consultation: {
                    select: { id: true, consultationDate: true },
                },
            },
        });
        res.json({ labResults });
    }
    catch (error) {
        next(error);
    }
});
// Generate PDF for lab result
router.get('/:id/pdf', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(`Generowanie PDF dla wyniku badania ${id}...`);
        const labResult = await prisma.labResult.findUnique({
            where: { id },
            include: {
                patient: true,
                consultation: {
                    select: { id: true, consultationDate: true },
                },
            },
        });
        if (!labResult) {
            return res.status(404).json({ error: 'Wynik laboratoryjny nie znaleziony' });
        }
        const pdfBuffer = await (0, pdfService_1.generateLabResultPDF)(labResult, labResult.patient);
        console.log(`PDF wygenerowany pomyślnie dla wyniku badania ${id}, rozmiar: ${pdfBuffer.length} bajtów`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="wynik-badan-${id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Błąd w endpoint PDF wyniku badania:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    }
});
// Get lab result by ID (MUST be after specific routes like /:id/pdf)
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const labResult = await prisma.labResult.findUnique({
            where: { id },
            include: {
                patient: true,
                consultation: {
                    select: { id: true, consultationDate: true },
                },
            },
        });
        if (!labResult) {
            return res.status(404).json({ error: 'Wynik laboratoryjny nie znaleziony' });
        }
        res.json({ labResult });
    }
    catch (error) {
        next(error);
    }
});
// Create lab result
router.post('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const data = labResultSchema.parse(req.body);
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: data.patientId },
        });
        if (!patient) {
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        // Calculate flags for all parameters
        const labDataWithFlags = (0, labResults_1.calculateLabFlags)(data);
        const labResult = await prisma.labResult.create({
            data: {
                ...labDataWithFlags,
                date: data.date ? new Date(data.date) : new Date(),
                consultationId: data.consultationId || undefined,
            },
            include: {
                patient: true,
                consultation: {
                    select: { id: true, consultationDate: true },
                },
            },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'CREATE_LAB_RESULT',
            entity: 'LabResult',
            entityId: labResult.id,
        });
        res.status(201).json({ labResult });
    }
    catch (error) {
        next(error);
    }
});
// Update lab result
router.put('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = labResultSchema.omit({ patientId: true }).parse(req.body);
        // Calculate flags
        const labDataWithFlags = (0, labResults_1.calculateLabFlags)(data);
        const labResult = await prisma.labResult.update({
            where: { id },
            data: {
                ...labDataWithFlags,
                date: data.date ? new Date(data.date) : undefined,
                consultationId: data.consultationId || undefined,
            },
            include: {
                patient: true,
                consultation: {
                    select: { id: true, consultationDate: true },
                },
            },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'UPDATE_LAB_RESULT',
            entity: 'LabResult',
            entityId: labResult.id,
        });
        res.json({ labResult });
    }
    catch (error) {
        next(error);
    }
});
// Archive lab result (soft delete)
router.delete('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const labResult = await prisma.labResult.update({
            where: { id },
            data: { isArchived: true },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'ARCHIVE_LAB_RESULT',
            entity: 'LabResult',
            entityId: labResult.id,
        });
        res.json({
            labResult,
            message: 'Wynik badania został zarchiwizowany'
        });
    }
    catch (error) {
        next(error);
    }
});
// Restore archived lab result
router.post('/:id/restore', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const labResult = await prisma.labResult.findUnique({
            where: { id },
        });
        if (!labResult) {
            return res.status(404).json({ error: 'Wynik badania nie znaleziony' });
        }
        if (!labResult.isArchived) {
            return res.status(400).json({ error: 'Wynik badania nie jest zarchiwizowany' });
        }
        const restoredLabResult = await prisma.labResult.update({
            where: { id },
            data: { isArchived: false },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'RESTORE_LAB_RESULT',
            entity: 'LabResult',
            entityId: restoredLabResult.id,
        });
        res.json({
            labResult: restoredLabResult,
            message: 'Wynik badania został przywrócony'
        });
    }
    catch (error) {
        next(error);
    }
});
// Permanently delete lab result (RODO/GDPR) - ADMIN only
router.delete('/:id/permanent', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const labResult = await prisma.labResult.findUnique({
            where: { id },
        });
        if (!labResult) {
            return res.status(404).json({ error: 'Wynik badania nie znaleziony' });
        }
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'PERMANENT_DELETE_LAB_RESULT',
            entity: 'LabResult',
            entityId: id,
        });
        // Permanent delete - RODO compliant
        await prisma.labResult.delete({
            where: { id },
        });
        res.json({
            message: 'Wynik badania został trwale usunięty zgodnie z RODO',
            deleted: true
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=labResults.js.map