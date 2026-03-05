import express from 'express';
import { z } from 'zod';
import path from 'path';
import { authenticate, requireRole, requireWriteAccess, AuthRequest } from '../middleware/auth';
import { authorizePatientAccess, canAccessPatient } from '../middleware/authorizePatientAccess';
import { prisma } from '../prisma';
import { writeAuditLog } from '../services/auditService';
import fs from 'fs';

const router = express.Router();

const isSafeFileName = (name: string): boolean => /^[a-zA-Z0-9._-]+$/.test(name);

const patientSchema = z.object({
  firstName: z.string().min(1, 'Imię jest wymagane'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane'),
  age: z.number().int().positive().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

// Get all patients (with search and pagination)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { search, page = '1', limit = '50', archived = 'false', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return res.status(400).json({ error: 'Nieprawidłowe parametry paginacji' });
    }
    const skip = (pageNum - 1) * limitNum;
    const isArchived = archived === 'true';

    const where: any = { isArchived };

    // [C-1] Defence-in-depth: scope list query to accessible patients
    const user = req.user!;
    if (user.role !== 'ADMIN') {
      if (user.clinicId) where.clinicId = user.clinicId;
      if (user.role === 'DOCTOR') {
        // DOCTOR sees patients assigned to them OR with explicit DoctorPatientAccess
        // Use AND to safely combine with search OR below
        where.AND = where.AND || [];
        where.AND.push({
          OR: [
            { assignedDoctorId: user.id },
            { doctorAccess: { some: { doctorId: user.id } } },
          ],
        });
      }
    }

    if (search) {
      const searchStr = search as string;
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { firstName: { contains: searchStr, mode: 'insensitive' } },
          { lastName: { contains: searchStr, mode: 'insensitive' } },
          { phone: { contains: searchStr, mode: 'insensitive' } },
          { email: { contains: searchStr, mode: 'insensitive' } },
        ],
      });
    }

    let patients;
    const total = await prisma.patient.count({ where });

    if (sortBy === 'lastVisit') {
      // JS Sorting fallback for relation aggregate
      let allPatients = await prisma.patient.findMany({
        where,
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
          notes: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          visits: {
            orderBy: { data: 'desc' },
            take: 1,
            select: { data: true }
          }
        }
      });

      allPatients.sort((a: any, b: any) => {
        const aDate = a.visits?.[0]?.data ? new Date(a.visits[0].data).getTime() : 0;
        const bDate = b.visits?.[0]?.data ? new Date(b.visits[0].data).getTime() : 0;
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      });

      // Map to remove 'visits' payload to match usual schema
      patients = allPatients.slice(skip, skip + limitNum).map(({ visits, ...rest }: any) => rest);
    } else {
      let orderByObj: any = { createdAt: 'desc' };
      if (sortBy === 'lastName') orderByObj = { lastName: sortOrder };
      else if (sortBy === 'createdAt') orderByObj = { createdAt: sortOrder };

      patients = await prisma.patient.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: orderByObj,
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
          notes: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

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
router.get('/:id', authenticate, authorizePatientAccess, async (req: AuthRequest, res, next) => {
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

    // Add URL field to scalp photos (support both new filename and legacy filePath)
    const patientWithUrls = {
      ...patient,
      scalpPhotos: patient.scalpPhotos.map((photo: any) => ({
        ...photo,
        url: `/uploads/${photo.filename || path.basename(photo.filePath || '')}`,
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
router.put('/:id', authenticate, requireWriteAccess(), authorizePatientAccess, async (req: AuthRequest, res, next) => {
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
router.delete('/:id', authenticate, requireWriteAccess(), authorizePatientAccess, async (req: AuthRequest, res, next) => {
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
router.post('/:id/restore', authenticate, requireWriteAccess(), authorizePatientAccess, async (req: AuthRequest, res, next) => {
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
        const fileName = photo.filename || (photo.filePath ? path.basename(photo.filePath) : '');
        if (!fileName || !isSafeFileName(fileName)) continue;
        const photoPath = path.join(__dirname, '../../storage/uploads', fileName);
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


