"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const auditService_1 = require("../services/auditService");
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
const patientSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'Imię jest wymagane'),
    lastName: zod_1.z.string().min(1, 'Nazwisko jest wymagane'),
    age: zod_1.z.number().int().positive().optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    occupation: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
});
// Get all patients (with search and pagination)
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const { search, page = '1', limit = '50', archived = 'false' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const isArchived = archived === 'true';
        const where = {
            isArchived,
        };
        if (search) {
            const searchStr = search;
            where.OR = [
                { firstName: { contains: searchStr, mode: 'insensitive' } },
                { lastName: { contains: searchStr, mode: 'insensitive' } },
                { phone: { contains: searchStr, mode: 'insensitive' } },
                { email: { contains: searchStr, mode: 'insensitive' } },
            ];
        }
        const [patients, total] = await Promise.all([
            prisma_1.prisma.patient.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    age: true,
                    gender: true,
                    phone: true,
                    email: true,
                    occupation: true,
                    address: true,
                    isArchived: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma_1.prisma.patient.count({ where }),
        ]);
        res.json({
            patients,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Get patient by ID
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id },
            include: {
                consultations: {
                    orderBy: { consultationDate: 'desc' },
                    take: 10,
                },
                labResults: {
                    orderBy: { date: 'desc' },
                    take: 10,
                },
                scalpPhotos: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                carePlans: {
                    where: {
                        isActive: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!patient) {
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        // Add URL field to scalp photos
        const patientWithUrls = {
            ...patient,
            scalpPhotos: patient.scalpPhotos.map((photo) => ({
                ...photo,
                url: `/uploads/${path_1.default.basename(photo.filePath)}`,
            })),
        };
        res.json({ patient: patientWithUrls });
    }
    catch (error) {
        next(error);
    }
});
// Create patient (DOCTOR/ADMIN only - ASSISTANT cannot create patients)
router.post('/', auth_1.authenticate, (0, auth_1.requireWriteAccess)(), async (req, res, next) => {
    try {
        const data = patientSchema.parse(req.body);
        const patient = await prisma_1.prisma.patient.create({
            data: {
                ...data,
                email: data.email || undefined,
            },
        });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'CREATE_PATIENT',
            entity: 'Patient',
            entityId: patient.id,
        });
        res.status(201).json({ patient });
    }
    catch (error) {
        next(error);
    }
});
// Update patient (DOCTOR/ADMIN only - ASSISTANT cannot update patients)
router.put('/:id', auth_1.authenticate, (0, auth_1.requireWriteAccess)(), async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = patientSchema.parse(req.body);
        const patient = await prisma_1.prisma.patient.update({
            where: { id },
            data: {
                ...data,
                email: data.email || undefined,
            },
        });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'UPDATE_PATIENT',
            entity: 'Patient',
            entityId: patient.id,
        });
        res.json({ patient });
    }
    catch (error) {
        next(error);
    }
});
// Archive patient (soft delete) (DOCTOR/ADMIN only - ASSISTANT cannot archive patients)
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireWriteAccess)(), async (req, res, next) => {
    try {
        const { id } = req.params;
        const patient = await prisma_1.prisma.patient.update({
            where: { id },
            data: { isArchived: true },
        });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'ARCHIVE_PATIENT',
            entity: 'Patient',
            entityId: patient.id,
        });
        res.json({ patient });
    }
    catch (error) {
        next(error);
    }
});
// Restore archived patient (DOCTOR/ADMIN only)
router.post('/:id/restore', auth_1.authenticate, (0, auth_1.requireWriteAccess)(), async (req, res, next) => {
    try {
        const { id } = req.params;
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id },
        });
        if (!patient) {
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        if (!patient.isArchived) {
            return res.status(400).json({ error: 'Pacjent nie jest zarchiwizowany' });
        }
        const restoredPatient = await prisma_1.prisma.patient.update({
            where: { id },
            data: { isArchived: false },
        });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'RESTORE_PATIENT',
            entity: 'Patient',
            entityId: restoredPatient.id,
        });
        res.json({ patient: restoredPatient, message: 'Pacjent został przywrócony' });
    }
    catch (error) {
        next(error);
    }
});
// Permanently delete patient and all related data (RODO/GDPR) - ADMIN only
router.delete('/:id/permanent', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id },
            include: {
                scalpPhotos: true,
            },
        });
        if (!patient) {
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        // Delete all scalp photo files from filesystem
        for (const photo of patient.scalpPhotos) {
            try {
                const photoPath = path_1.default.join(__dirname, '../../storage/uploads', path_1.default.basename(photo.filePath));
                if (fs_1.default.existsSync(photoPath)) {
                    fs_1.default.unlinkSync(photoPath);
                }
            }
            catch (fileError) {
                console.error(`Error deleting photo file ${photo.filePath}:`, fileError);
                // Continue with deletion even if file deletion fails
            }
        }
        // Delete patient (cascade will delete all related data)
        // Prisma will automatically delete:
        // - consultations (onDelete: Cascade)
        // - labResults (onDelete: Cascade)
        // - scalpPhotos (onDelete: Cascade)
        // - carePlans (onDelete: Cascade)
        // - reminders (onDelete: Cascade)
        // - emailHistory (onDelete: Cascade)
        await prisma_1.prisma.patient.delete({
            where: { id },
        });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'PERMANENT_DELETE_PATIENT',
            entity: 'Patient',
            entityId: patient.id,
        });
        res.json({
            message: 'Pacjent i wszystkie powiązane dane zostały trwale usunięte zgodnie z RODO',
            deletedPatient: {
                id: patient.id,
                name: `${patient.firstName} ${patient.lastName}`,
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=patients.js.map