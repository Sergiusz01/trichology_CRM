import express from 'express';
import { z } from 'zod';
import path from 'path';
import { authenticate, requireRole, requireWriteAccess, AuthRequest } from '../middleware/auth';
import { authorizePatientAccess, canAccessPatient } from '../middleware/authorizePatientAccess';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { writeAuditLog } from '../services/auditService';
import fs from 'fs';
import { logger } from '../utils/logger';

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
  assignedDoctorId: z.string().nullable().optional(),
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

    const andConditions: Prisma.PatientWhereInput[] = [];
    const where: Prisma.PatientWhereInput = { isArchived };

    // [C-1] Defence-in-depth: scope list query by clinic if set
    const user = req.user!;
    if (user.role !== 'ADMIN') {
      if (user.clinicId) where.clinicId = user.clinicId;
      // DOCTOR and ASSISTANT now see ALL patients in the clinic
    }

    if (search) {
      const searchStr = search as string;
      andConditions.push({
        OR: [
          { firstName: { contains: searchStr, mode: 'insensitive' } },
          { lastName: { contains: searchStr, mode: 'insensitive' } },
          { phone: { contains: searchStr, mode: 'insensitive' } },
          { email: { contains: searchStr, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
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
          assignedDoctorId: true,
          assignedDoctor: { select: { id: true, name: true } },
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
      let orderByObj: Prisma.PatientOrderByWithRelationInput = { createdAt: 'desc' };
      if (sortBy === 'lastName') orderByObj = { lastName: sortOrder as Prisma.SortOrder };
      else if (sortBy === 'createdAt') orderByObj = { createdAt: sortOrder as Prisma.SortOrder };

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
          assignedDoctorId: true,
          assignedDoctor: { select: { id: true, name: true } },
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

// List active doctors (for assign-doctor dropdown) — any authenticated user
router.get('/doctors', authenticate, async (_req, res, next) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR', isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json({ doctors });
  } catch (error) {
    next(error);
  }
});

// Search patients (diacritic-agnostic)
router.get('/search', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ patients: [] });
    }

    const where: Prisma.PatientWhereInput = { isArchived: false };
    if (req.user!.role !== 'ADMIN' && req.user!.clinicId) {
      where.clinicId = req.user!.clinicId;
    }

    const allPatients = await prisma.patient.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      }
    });

    const normalize = (str: string) => 
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l').replace(/\u0141/g, 'L').toLowerCase();

    const searchStr = normalize(q);

    const filtered = allPatients.filter((p: any) => {
      const full = normalize(`${p.firstName} ${p.lastName}`);
      const reverse = normalize(`${p.lastName} ${p.firstName}`);
      return full.includes(searchStr) || 
             reverse.includes(searchStr) || 
             (p.email && normalize(p.email).includes(searchStr)) || 
             (p.phone && p.phone.includes(q));
    }).slice(0, 8);

    res.json({ patients: filtered });
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
    const user = req.user!;

    // Determine assignedDoctorId:
    // - ADMIN: use provided value (may be null to leave unassigned)
    // - DOCTOR: auto-assign to themselves
    let assignedDoctorId: string | null | undefined;
    if (user.role === 'ADMIN') {
      assignedDoctorId = data.assignedDoctorId ?? null;
    } else if (user.role === 'DOCTOR') {
      assignedDoctorId = user.id;
    }

    const { assignedDoctorId: _ignored, ...rest } = data;
    const patient = await prisma.patient.create({
      data: {
        ...rest,
        email: rest.email || undefined,
        assignedDoctorId,
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
    const user = req.user!;

    const { assignedDoctorId, ...rest } = data;

    // Only ADMIN may change assignedDoctorId
    // Preserve null for nullable fields so Prisma clears them when user removes the value.
    // Convert empty strings '' to null (Zod allows z.literal('') for optional email).
    const updateData: any = {
      ...rest,
      email:      (rest.email      === '' ? null : rest.email)      ?? null,
      phone:      (rest.phone      === '' ? null : rest.phone)      ?? undefined,
      occupation: (rest.occupation === '' ? null : rest.occupation) ?? undefined,
      address:    (rest.address    === '' ? null : rest.address)    ?? undefined,
    };
    if (user.role === 'ADMIN') {
      updateData.assignedDoctorId = assignedDoctorId ?? null;
    }


    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
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
        logger.error(`Error deleting photo file ${photo.filePath}`, { error: String(fileError) });
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


