import express from 'express';
import { z } from 'zod';
import path from 'path';
import { authenticate, requireRole, requireWriteAccess, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { writeAuditLog } from '../services/auditService';
import fs from 'fs';

const router = express.Router();

const patientSchema = z.object({
  firstName: z.string().min(1, 'Imię jest wymagane'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane'),
  age: z.number().int().positive().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

// Get all patients (with search and pagination)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { search, page = '1', limit = '50', archived = 'false' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    const isArchived = archived === 'true';

    const where: any = {
      isArchived,
    };

    if (search) {
      const searchStr = search as string;
      where.OR = [
        { firstName: { contains: searchStr, mode: 'insensitive' } },
        { lastName: { contains: searchStr, mode: 'insensitive' } },
        { phone: { contains: searchStr, mode: 'insensitive' } },
        { email: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
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
      prisma.patient.count({ where }),
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
  } catch (error) {
    next(error);
  }
});

// Get patient by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
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

    // Add URL field to scalp photos (use secured route)
    const patientWithUrls = {
      ...patient,
      scalpPhotos: patient.scalpPhotos.map((photo: any) => ({
        ...photo,
        url: `/api/scalp-photos/${photo.id}/file`,
      })),
    };

    res.json({ patient: patientWithUrls });
  } catch (error) {
    next(error);
  }
});

// Create patient (DOCTOR/ADMIN only - ASSISTANT cannot create patients)
router.post('/', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const data = patientSchema.parse(req.body);

    const patient = await prisma.patient.create({
      data: {
        ...data,
        email: data.email || undefined,
      },
    });

    // Audit log
    await writeAuditLog(req, {
      action: 'CREATE_PATIENT',
      entity: 'Patient',
      entityId: patient.id,
    });

    res.status(201).json({ patient });
  } catch (error) {
    next(error);
  }
});

// Update patient (DOCTOR/ADMIN only - ASSISTANT cannot update patients)
router.put('/:id', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = patientSchema.parse(req.body);

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...data,
        email: data.email || undefined,
      },
    });

    // Audit log
    await writeAuditLog(req, {
      action: 'UPDATE_PATIENT',
      entity: 'Patient',
      entityId: patient.id,
    });

    res.json({ patient });
  } catch (error) {
    next(error);
  }
});

// Archive patient (soft delete) (DOCTOR/ADMIN only - ASSISTANT cannot archive patients)
router.delete('/:id', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.update({
      where: { id },
      data: { isArchived: true },
    });

    // Audit log
    await writeAuditLog(req, {
      action: 'ARCHIVE_PATIENT',
      entity: 'Patient',
      entityId: patient.id,
    });

    res.json({ patient });
  } catch (error) {
    next(error);
  }
});

// Restore archived patient (DOCTOR/ADMIN only)
router.post('/:id/restore', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    }

    if (!patient.isArchived) {
      return res.status(400).json({ error: 'Pacjent nie jest zarchiwizowany' });
    }

    const restoredPatient = await prisma.patient.update({
      where: { id },
      data: { isArchived: false },
    });

    // Audit log
    await writeAuditLog(req, {
      action: 'RESTORE_PATIENT',
      entity: 'Patient',
      entityId: restoredPatient.id,
    });

    res.json({ patient: restoredPatient, message: 'Pacjent został przywrócony' });
  } catch (error) {
    next(error);
  }
});

// Permanently delete patient and all related data (RODO/GDPR) - ADMIN only
router.delete('/:id/permanent', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
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
        const photoPath = path.join(__dirname, '../../storage/uploads', path.basename(photo.filePath));
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      } catch (fileError) {
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
    await prisma.patient.delete({
      where: { id },
    });

    // Audit log
    await writeAuditLog(req, {
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
  } catch (error) {
    next(error);
  }
});

export default router;


