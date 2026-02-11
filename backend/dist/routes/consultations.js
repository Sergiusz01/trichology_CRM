"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const pdfService_1 = require("../services/pdfService");
const auditService_1 = require("../services/auditService");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
// Large schema for consultation - all fields from the form
const consultationSchema = zod_1.z.object({
    patientId: zod_1.z.string(),
    consultationDate: zod_1.z.union([
        zod_1.z.string().datetime(),
        zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    ]).optional(),
    templateId: zod_1.z.string().optional(),
    dynamicData: zod_1.z.record(zod_1.z.any()).optional(), // For dynamic template-based consultations
    // 1. WYPADANIE WŁOSÓW
    hairLossSeverity: zod_1.z.string().optional(),
    hairLossLocalization: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    hairLossDuration: zod_1.z.string().optional(),
    hairLossShampoos: zod_1.z.string().optional(),
    // 2. PRZETŁUSZCZANIE WŁOSÓW
    oilyHairSeverity: zod_1.z.string().optional(),
    oilyHairWashingFreq: zod_1.z.string().optional(),
    oilyHairDuration: zod_1.z.string().optional(),
    oilyHairShampoos: zod_1.z.string().optional(),
    // 3. ŁUSZCZENIE SKÓRY GŁOWY
    scalingSeverity: zod_1.z.string().optional(),
    scalingType: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    scalingDuration: zod_1.z.string().optional(),
    scalingOther: zod_1.z.string().optional(),
    // 4. WRAŻLIWOŚĆ SKÓRY GŁOWY
    sensitivitySeverity: zod_1.z.string().optional(),
    sensitivityProblemType: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    sensitivityDuration: zod_1.z.string().optional(),
    sensitivityOther: zod_1.z.string().optional(),
    // 5. STANY ZAPALNE/GRUDKI
    inflammatoryStates: zod_1.z.string().optional(),
    // WYWIAD
    familyHistory: zod_1.z.string().optional(),
    dermatologyVisits: zod_1.z.string().optional(),
    dermatologyVisitsReason: zod_1.z.string().optional(),
    pregnancy: zod_1.z.string().optional(),
    menstruationRegularity: zod_1.z.string().optional(),
    contraception: zod_1.z.string().optional(),
    medications: zod_1.z.string().optional(),
    medicationsList: zod_1.z.string().optional(),
    supplements: zod_1.z.string().optional(),
    stressLevel: zod_1.z.string().optional(),
    anesthesia: zod_1.z.string().optional(),
    chemotherapy: zod_1.z.string().optional(),
    radiotherapy: zod_1.z.string().optional(),
    vaccination: zod_1.z.string().optional(),
    antibiotics: zod_1.z.string().optional(),
    chronicDiseases: zod_1.z.string().optional(),
    chronicDiseasesList: zod_1.z.string().optional(),
    specialists: zod_1.z.string().optional(),
    specialistsList: zod_1.z.string().optional(),
    eatingDisorders: zod_1.z.string().optional(),
    foodIntolerances: zod_1.z.string().optional(),
    diet: zod_1.z.string().optional(),
    allergies: zod_1.z.string().optional(),
    metalPartsInBody: zod_1.z.string().optional(),
    careRoutineShampoo: zod_1.z.string().optional(),
    careRoutineConditioner: zod_1.z.string().optional(),
    careRoutineOils: zod_1.z.string().optional(),
    careRoutineChemical: zod_1.z.string().optional(),
    // TRICHOSKOPIA
    scalpType: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    scalpAppearance: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    skinLesions: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    hyperhidrosis: zod_1.z.string().optional(),
    hyperkeratinization: zod_1.z.string().optional(),
    sebaceousSecretion: zod_1.z.string().optional(),
    seborrheaType: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    seborrheaTypeOther: zod_1.z.string().optional(),
    dandruffType: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    scalpPH: zod_1.z.string().optional(),
    hairDamage: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    hairDamageReason: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    hairQuality: zod_1.z.string().optional(),
    hairShape: zod_1.z.string().optional(),
    hairTypes: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    regrowingHairs: zod_1.z.string().optional(),
    vellusMiniaturizedHairs: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    // DIAGNOSTYKA
    vascularPatterns: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    perifollicularFeatures: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    scalpDiseases: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    otherDiagnostics: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    // DIAGNOSTYKA ŁYSIENIA
    alopeciaTypes: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    degreeOfThinning: zod_1.z.string().optional(),
    alopeciaType: zod_1.z.string().optional(),
    alopeciaAffectedAreas: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(), // Json array
    miniaturization: zod_1.z.string().optional(),
    follicularUnits: zod_1.z.string().optional(),
    pullTest: zod_1.z.string().optional(),
    alopeciaOther: zod_1.z.string().optional(),
    // Diagnosis
    diagnosis: zod_1.z.string().optional(),
    // ZALECENIA DO PIELĘGNACJI
    careRecommendationsWashing: zod_1.z.string().optional(),
    careRecommendationsTopical: zod_1.z.string().optional(),
    careRecommendationsSupplement: zod_1.z.string().optional(),
    careRecommendationsBehavior: zod_1.z.string().optional(),
    // Visits/Procedures
    visitsProcedures: zod_1.z.string().optional(),
    // General Remarks
    generalRemarks: zod_1.z.string().optional(),
    // Scales
    norwoodHamiltonStage: zod_1.z.string().optional(),
    norwoodHamiltonNotes: zod_1.z.string().optional(),
    ludwigStage: zod_1.z.string().optional(),
    ludwigNotes: zod_1.z.string().optional(),
});
// Get all consultations (for dashboard and reports)
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const { limit = '100' } = req.query;
        const limitNum = parseInt(limit, 10);
        const consultations = await prisma_1.prisma.consultation.findMany({
            take: limitNum,
            orderBy: { consultationDate: 'desc' },
            include: {
                patient: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                doctor: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        res.json({ consultations });
    }
    catch (error) {
        next(error);
    }
});
// Get consultations for a patient
router.get('/patient/:patientId', auth_1.authenticate, async (req, res, next) => {
    const { archived = 'false' } = req.query;
    const isArchived = archived === 'true';
    try {
        const { patientId } = req.params;
        const consultations = await prisma_1.prisma.consultation.findMany({
            where: {
                patientId,
                isArchived,
            },
            orderBy: { consultationDate: 'desc' },
            include: {
                doctor: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        res.json({ consultations });
    }
    catch (error) {
        next(error);
    }
});
// Generate PDF for consultation (MUST be before /:id route)
router.get('/:id/pdf', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const consultation = await prisma_1.prisma.consultation.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if (!consultation) {
            return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
        }
        console.log(`Generowanie PDF dla konsultacji ${id}...`);
        const pdfBuffer = await (0, pdfService_1.generateConsultationPDF)(consultation);
        console.log(`PDF wygenerowany pomyślnie dla konsultacji ${id}, rozmiar: ${pdfBuffer.length} bajtów`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="konsultacja-${id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Błąd w endpoint PDF konsultacji:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    }
});
// Get consultation by ID (MUST be after specific routes like /patient/:patientId and /:id/pdf)
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        console.log(`[GET /consultations/:id] Request - ID: ${id}, User: ${userId}, Path: ${req.path}`);
        // First check if consultation exists
        const consultation = await prisma_1.prisma.consultation.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: {
                    select: { id: true, name: true, email: true },
                },
                template: {
                    select: { id: true, name: true, fields: true },
                },
            },
        });
        if (!consultation) {
            console.log(`[GET /consultations/:id] Consultation not found - ID: ${id}`);
            // Check if any consultations exist at all
            const count = await prisma_1.prisma.consultation.count();
            console.log(`[GET /consultations/:id] Total consultations in DB: ${count}`);
            return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
        }
        console.log(`[GET /consultations/:id] Consultation found - ID: ${consultation.id}, Patient: ${consultation.patientId}`);
        res.json({ consultation });
    }
    catch (error) {
        console.error('[GET /consultations/:id] Error:', error.message, error.stack);
        next(error);
    }
});
// Helper function to convert arrays/JSON strings to proper format for Prisma
// Prisma Json type expects JavaScript objects/arrays, not JSON strings
const prepareDataForDb = (data) => {
    const jsonFields = [
        'hairLossLocalization',
        'scalingType',
        'sensitivityProblemType',
        'scalpType',
        'scalpAppearance',
        'skinLesions',
        'seborrheaType',
        'dandruffType',
        'hairDamage',
        'hairDamageReason',
        'hairTypes',
        'vellusMiniaturizedHairs',
        'vascularPatterns',
        'perifollicularFeatures',
        'scalpDiseases',
        'otherDiagnostics',
        'alopeciaTypes',
        'alopeciaAffectedAreas',
    ];
    const prepared = {};
    // First, handle all non-JSON fields (regular string fields)
    Object.keys(data).forEach((key) => {
        // Skip JSON fields, patientId, and consultationDate (handled separately in route)
        if (!jsonFields.includes(key) && key !== 'patientId' && key !== 'consultationDate') {
            const value = data[key];
            // If it's undefined, null, or empty string, set to null
            if (value === undefined || value === null || value === '') {
                prepared[key] = null;
            }
            // If it's an array (which shouldn't happen for non-JSON fields), log warning and set to null
            else if (Array.isArray(value)) {
                console.warn(`[prepareDataForDb] Non-JSON field ${key} is an array, setting to null`);
                prepared[key] = null;
            }
            // Otherwise keep the value as is
            else {
                prepared[key] = value;
            }
        }
    });
    // Now handle JSON fields - convert to JavaScript arrays/objects
    jsonFields.forEach((field) => {
        const value = data[field];
        if (value !== undefined && value !== null && value !== '') {
            // If it's already an array, use it directly (Prisma Json accepts arrays)
            if (Array.isArray(value)) {
                prepared[field] = value.length > 0 ? value : null;
            }
            // If it's a JSON string, parse it
            else if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    // Prisma Json expects JavaScript arrays/objects, not JSON strings
                    if (Array.isArray(parsed)) {
                        prepared[field] = parsed.length > 0 ? parsed : null;
                    }
                    else if (typeof parsed === 'object' && parsed !== null) {
                        prepared[field] = parsed;
                    }
                    else {
                        prepared[field] = null;
                    }
                }
                catch (e) {
                    // If parsing fails, it's not valid JSON - set to null
                    console.warn(`[prepareDataForDb] Failed to parse JSON for field ${field}:`, e);
                    prepared[field] = null;
                }
            }
            // If it's an object, use it directly
            else if (typeof value === 'object') {
                prepared[field] = value;
            }
            // Otherwise set to null
            else {
                prepared[field] = null;
            }
        }
        else {
            // If undefined, null, or empty, set to null
            prepared[field] = null;
        }
    });
    // Clean up undefined values - Prisma doesn't like them
    Object.keys(prepared).forEach((key) => {
        if (prepared[key] === undefined) {
            delete prepared[key];
        }
    });
    return prepared;
};
// Create consultation
router.post('/', auth_1.authenticate, async (req, res, next) => {
    try {
        // Log incoming request data for debugging
        console.log('[POST /consultations] Incoming request keys:', Object.keys(req.body));
        console.log('[POST /consultations] PatientId:', req.body.patientId);
        // Parse and validate data
        let data;
        try {
            data = consultationSchema.parse(req.body);
        }
        catch (validationError) {
            console.error('[POST /consultations] Validation error:', validationError.errors);
            return res.status(400).json({
                error: 'Błąd walidacji danych',
                details: validationError.errors,
            });
        }
        const doctorId = req.user.id;
        // Verify patient exists
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: data.patientId },
        });
        if (!patient) {
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        const preparedData = prepareDataForDb(data);
        // Handle consultationDate - convert date string to Date object
        let consultationDate = new Date();
        if (data.consultationDate) {
            // If it's a date string (YYYY-MM-DD), add time to make it valid
            if (data.consultationDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                consultationDate = new Date(data.consultationDate + 'T00:00:00');
            }
            else {
                consultationDate = new Date(data.consultationDate);
            }
        }
        // Handle template and dynamic data
        if (data.templateId) {
            // Verify template exists and belongs to doctor
            const template = await prisma_1.prisma.consultationTemplate.findFirst({
                where: {
                    id: data.templateId,
                    doctorId,
                    isActive: true,
                },
            });
            if (!template) {
                return res.status(404).json({ error: 'Szablon nie znaleziony' });
            }
            preparedData.templateId = data.templateId;
            preparedData.dynamicData = data.dynamicData || {};
        }
        // Define JSON fields list for logging (same as in prepareDataForDb)
        const jsonFieldsList = [
            'hairLossLocalization',
            'scalingType',
            'sensitivityProblemType',
            'scalpType',
            'scalpAppearance',
            'skinLesions',
            'seborrheaType',
            'dandruffType',
            'hairDamage',
            'hairDamageReason',
            'hairTypes',
            'vellusMiniaturizedHairs',
            'vascularPatterns',
            'perifollicularFeatures',
            'scalpDiseases',
            'otherDiagnostics',
            'alopeciaTypes',
            'alopeciaAffectedAreas',
        ];
        // Log prepared data for debugging (but limit JSON fields to avoid huge logs)
        const logData = { ...preparedData };
        jsonFieldsList.forEach((field) => {
            if (logData[field]) {
                logData[field] = Array.isArray(logData[field])
                    ? `[Array with ${logData[field].length} items]`
                    : typeof logData[field];
            }
        });
        console.log('[POST /consultations] Prepared data (summary):', JSON.stringify(logData, null, 2));
        console.log('[POST /consultations] Full prepared data keys:', Object.keys(preparedData));
        // Build final data object for Prisma
        const dataForPrisma = {
            ...preparedData,
            templateId: preparedData.templateId || null,
            dynamicData: preparedData.dynamicData || null,
            patientId: data.patientId,
            doctorId,
            consultationDate,
        };
        // Remove any undefined values
        Object.keys(dataForPrisma).forEach((key) => {
            if (dataForPrisma[key] === undefined) {
                delete dataForPrisma[key];
            }
        });
        console.log('[POST /consultations] Final data keys for Prisma:', Object.keys(dataForPrisma));
        console.log('[POST /consultations] PatientId:', dataForPrisma.patientId);
        console.log('[POST /consultations] DoctorId:', dataForPrisma.doctorId);
        console.log('[POST /consultations] hairLossLocalization type:', typeof dataForPrisma.hairLossLocalization, Array.isArray(dataForPrisma.hairLossLocalization) ? '(array)' : '(not array)');
        console.log('[POST /consultations] hairLossLocalization value:', JSON.stringify(dataForPrisma.hairLossLocalization));
        try {
            const consultation = await prisma_1.prisma.consultation.create({
                data: dataForPrisma,
                include: {
                    patient: true,
                    doctor: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });
            await (0, auditService_1.writeAuditLog)(req, {
                action: 'CREATE_CONSULTATION',
                entity: 'Consultation',
                entityId: consultation.id,
            });
            res.status(201).json({ consultation });
        }
        catch (dbError) {
            console.error('[POST /consultations] Prisma error message:', dbError.message);
            console.error('[POST /consultations] Prisma error code:', dbError.code);
            console.error('[POST /consultations] Full error:', dbError);
            if (dbError.meta) {
                console.error('[POST /consultations] Prisma error meta:', JSON.stringify(dbError.meta, null, 2));
            }
            // Extract more details about which field caused the error
            let errorDetails = dbError.meta || {};
            if (dbError.message) {
                // Try to extract field name from error message
                const fieldMatch = dbError.message.match(/Argument `(\w+)`/);
                if (fieldMatch) {
                    errorDetails.field = fieldMatch[1];
                    errorDetails.providedValue = dataForPrisma[fieldMatch[1]];
                }
            }
            return res.status(500).json({
                error: 'Wewnętrzny błąd serwera',
                message: dbError.message,
                details: errorDetails,
            });
        }
    }
    catch (error) {
        // Log validation errors for debugging
        if (error.name === 'ZodError') {
            console.error('Validation error:', JSON.stringify(error.errors, null, 2));
            return res.status(400).json({
                error: 'Błąd walidacji danych',
                details: error.errors,
            });
        }
        console.error('[POST /consultations] Unexpected error:', error);
        next(error);
    }
});
// Update consultation
router.put('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = consultationSchema.omit({ patientId: true }).parse(req.body);
        const preparedData = prepareDataForDb(data);
        // Handle consultationDate - convert date string to Date object
        let consultationDate = undefined;
        if (data.consultationDate) {
            // If it's a date string (YYYY-MM-DD), add time to make it valid
            if (data.consultationDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                consultationDate = new Date(data.consultationDate + 'T00:00:00');
            }
            else {
                consultationDate = new Date(data.consultationDate);
            }
        }
        // Handle template and dynamic data
        const updateData = {
            ...preparedData,
            consultationDate,
        };
        if (data.templateId !== undefined) {
            if (data.templateId) {
                // Verify template exists and belongs to doctor
                const doctorId = req.user.id;
                const template = await prisma_1.prisma.consultationTemplate.findFirst({
                    where: {
                        id: data.templateId,
                        doctorId,
                        isActive: true,
                    },
                });
                if (!template) {
                    return res.status(404).json({ error: 'Szablon nie znaleziony' });
                }
                updateData.templateId = data.templateId;
                updateData.dynamicData = data.dynamicData || {};
            }
            else {
                // Remove template
                updateData.templateId = null;
                updateData.dynamicData = null;
            }
        }
        const consultation = await prisma_1.prisma.consultation.update({
            where: { id },
            data: updateData,
            include: {
                patient: true,
                doctor: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'UPDATE_CONSULTATION',
            entity: 'Consultation',
            entityId: consultation.id,
        });
        res.json({ consultation });
    }
    catch (error) {
        // Log validation errors for debugging
        if (error.name === 'ZodError') {
            console.error('Validation error:', JSON.stringify(error.errors, null, 2));
            return res.status(400).json({
                error: 'Błąd walidacji danych',
                details: error.errors,
            });
        }
        next(error);
    }
});
// Archive consultation (soft delete)
router.delete('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const consultation = await prisma_1.prisma.consultation.update({
            where: { id },
            data: { isArchived: true },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'ARCHIVE_CONSULTATION',
            entity: 'Consultation',
            entityId: consultation.id,
        });
        res.json({
            consultation,
            message: 'Konsultacja została zarchiwizowana'
        });
    }
    catch (error) {
        next(error);
    }
});
// Restore archived consultation
router.post('/:id/restore', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const consultation = await prisma_1.prisma.consultation.findUnique({
            where: { id },
        });
        if (!consultation) {
            return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
        }
        if (!consultation.isArchived) {
            return res.status(400).json({ error: 'Konsultacja nie jest zarchiwizowana' });
        }
        const restoredConsultation = await prisma_1.prisma.consultation.update({
            where: { id },
            data: { isArchived: false },
        });
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'RESTORE_CONSULTATION',
            entity: 'Consultation',
            entityId: restoredConsultation.id,
        });
        res.json({
            consultation: restoredConsultation,
            message: 'Konsultacja została przywrócona'
        });
    }
    catch (error) {
        next(error);
    }
});
// Permanently delete consultation (RODO/GDPR) - ADMIN only
router.delete('/:id/permanent', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const consultation = await prisma_1.prisma.consultation.findUnique({
            where: { id },
        });
        if (!consultation) {
            return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
        }
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'PERMANENT_DELETE_CONSULTATION',
            entity: 'Consultation',
            entityId: id,
        });
        // Prisma will cascade delete:
        // - labResults (onDelete: SetNull - consultationId will be set to null)
        // - scalpPhotos (onDelete: SetNull - consultationId will be set to null)
        // - carePlans (onDelete: SetNull - consultationId will be set to null)
        // - emailHistory (onDelete: SetNull - consultationId will be set to null)
        await prisma_1.prisma.consultation.delete({
            where: { id },
        });
        res.json({
            message: 'Konsultacja została trwale usunięta zgodnie z RODO',
            deleted: true
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=consultations.js.map