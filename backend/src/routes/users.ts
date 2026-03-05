import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { hashPassword } from '../utils/password';
import { writeAuditLog } from '../services/auditService';
import type { Request } from 'express';

const router = express.Router();

const createUserSchema = z.object({
    name: z.string().min(1, 'Imię jest wymagane').max(100),
    email: z.string().email('Nieprawidłowy adres email'),
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/, 'Hasło musi zawierać min. 8 znaków, w tym małą i wielką literę oraz cyfrę'),
    role: z.enum(['ADMIN', 'DOCTOR', 'ASSISTANT']).optional(),
});

const updateUserSchema = z.object({
    name: z.string().min(1, 'Imię jest wymagane').max(100).optional(),
    role: z.enum(['ADMIN', 'DOCTOR', 'ASSISTANT']).optional(),
    isActive: z.boolean().optional(),
});

const patientAccessSchema = z.object({
    patientIds: z.array(z.string().min(1)).min(1, 'Lista pacjentów jest wymagana'),
});

// Middleware to check if user is admin - uses already-authenticated req.user to avoid redundant DB query
const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Odmowa dostępu. Wymagane uprawnienia administratora.' });
    }
    next();
};

router.use(authenticate, requireAdmin);

// GET all users
router.get('/', async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: { patientAccess: true },
                },
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (err) {
        next(err);
    }
});

// POST to create a new user
router.post('/', async (req, res, next) => {
    try {
        const data = createUserSchema.parse(req.body);
        const { name, email, password, role } = data;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Użytkownik o tym adresie email już istnieje' });
        }

        const passwordHash = await hashPassword(password);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role || 'DOCTOR'
            },
            select: { id: true, name: true, email: true, role: true, isActive: true }
        });

        res.status(201).json(newUser);
    } catch (err) {
        next(err);
    }
});

// PUT to update user (role, isActive)
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = updateUserSchema.parse(req.body);

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        const updated = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, isActive: true }
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// POST reset password
router.post('/:id/reset-password', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
            return res.status(400).json({ error: 'Hasło musi mieć od 6 do 128 znaków' });
        }

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        const passwordHash = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id },
            data: { passwordHash }
        });

        res.json({ message: 'Hasło zostało zmienione' });
    } catch (err) {
        next(err);
    }
});

// DELETE user — only if no system activity; cannot delete self or last admin
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const requestingUserId = req.user!.id;

        if (id === requestingUserId) {
            return res.status(400).json({ error: 'Nie możesz usunąć własnego konta.' });
        }

        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        // Prevent deleting the last admin
        if (target.role === 'ADMIN') {
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Nie możesz usunąć ostatniego administratora.' });
            }
        }

        // Check if user has any activity that would violate FK constraints
        const [consultCount, auditCount, photoCount, carePlanCount, emailHistCount] = await Promise.all([
            prisma.consultation.count({ where: { doctorId: id } }),
            prisma.auditLog.count({ where: { userId: id } }),
            prisma.scalpPhoto.count({ where: { uploadedByUserId: id } }),
            prisma.carePlan.count({ where: { createdByUserId: id } }),
            prisma.emailHistory.count({ where: { sentByUserId: id } }),
        ]);

        const totalActivity = consultCount + auditCount + photoCount + carePlanCount + emailHistCount;
        if (totalActivity > 0) {
            return res.status(409).json({
                error: 'Użytkownik ma powiązane dane w systemie i nie może zostać trwale usunięty. Dezaktywuj konto zamiast go usuwać.',
                canDeactivate: true,
                activity: { consultCount, auditCount, photoCount, carePlanCount, emailHistCount },
            });
        }

        await prisma.user.delete({ where: { id } });

        await writeAuditLog(req, {
            action: 'DELETE_USER',
            entity: 'User',
            entityId: id,
        });

        res.json({ message: 'Użytkownik został usunięty' });
    } catch (err) {
        next(err);
    }
});

// ─── Doctor-Patient Access Management ───────────────────────────────────────

// GET /users/:id/patient-access — list patients the doctor has explicit access to
router.get('/:id/patient-access', async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
        if (!user) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        const accessRecords = await prisma.doctorPatientAccess.findMany({
            where: { doctorId: id },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: { grantedAt: 'desc' },
        });

        const patients = accessRecords.map((r) => ({
            ...r.patient,
            grantedAt: r.grantedAt,
        }));

        res.json({ patients });
    } catch (err) {
        next(err);
    }
});

// POST /users/:id/patient-access — grant access to patients (bulk)
router.post('/:id/patient-access', async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const { patientIds } = patientAccessSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
        if (!user) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        // Verify all patients exist
        const existingPatients = await prisma.patient.findMany({
            where: { id: { in: patientIds } },
            select: { id: true },
        });
        const existingIds = new Set(existingPatients.map((p) => p.id));
        const validIds = patientIds.filter((pid) => existingIds.has(pid));

        if (validIds.length === 0) {
            return res.status(400).json({ error: 'Nie znaleziono żadnych pacjentów' });
        }

        // Use createMany with skipDuplicates to avoid errors on existing grants
        const result = await prisma.doctorPatientAccess.createMany({
            data: validIds.map((patientId) => ({
                doctorId: id,
                patientId,
            })),
            skipDuplicates: true,
        });

        // Audit log
        await writeAuditLog(req, {
            action: 'GRANT_PATIENT_ACCESS',
            entity: 'DoctorPatientAccess',
            entityId: id,
        });

        res.status(201).json({
            message: `Przyznano dostęp do ${result.count} pacjentów`,
            granted: result.count,
        });
    } catch (err) {
        next(err);
    }
});

// DELETE /users/:id/patient-access/:patientId — revoke access to a specific patient
router.delete('/:id/patient-access/:patientId', async (req: AuthRequest, res, next) => {
    try {
        const { id, patientId } = req.params;

        const accessRecord = await prisma.doctorPatientAccess.findUnique({
            where: { doctorId_patientId: { doctorId: id, patientId } },
        });

        if (!accessRecord) {
            return res.status(404).json({ error: 'Uprawnienie nie znalezione' });
        }

        await prisma.doctorPatientAccess.delete({
            where: { id: accessRecord.id },
        });

        // Audit log
        await writeAuditLog(req, {
            action: 'REVOKE_PATIENT_ACCESS',
            entity: 'DoctorPatientAccess',
            entityId: id,
        });

        res.json({ message: 'Uprawnienie zostało usunięte' });
    } catch (err) {
        next(err);
    }
});

// PUT /users/:id/patient-access — replace all access grants for a doctor (sync)
router.put('/:id/patient-access', async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const { patientIds } = z.object({
            patientIds: z.array(z.string()),
        }).parse(req.body);

        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
        if (!user) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        // Transaction: delete all existing + create new
        await prisma.$transaction(async (tx) => {
            await tx.doctorPatientAccess.deleteMany({ where: { doctorId: id } });

            if (patientIds.length > 0) {
                // Verify patients exist
                const existingPatients = await tx.patient.findMany({
                    where: { id: { in: patientIds } },
                    select: { id: true },
                });

                await tx.doctorPatientAccess.createMany({
                    data: existingPatients.map((p) => ({
                        doctorId: id,
                        patientId: p.id,
                    })),
                });
            }
        });

        // Audit log
        await writeAuditLog(req, {
            action: 'SYNC_PATIENT_ACCESS',
            entity: 'DoctorPatientAccess',
            entityId: id,
        });

        res.json({ message: 'Uprawnienia zostały zaktualizowane' });
    } catch (err) {
        next(err);
    }
});

export default router;
