import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

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
          where: { isActive: true },
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
      scalpPhotos: patient.scalpPhotos.map((photo: any) => ({
        ...photo,
        url: `/uploads/${path.basename(photo.filePath)}`,
      })),
    };

    res.json({ patient: patientWithUrls });
  } catch (error) {
    next(error);
  }
});

// Create patient
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = patientSchema.parse(req.body);

    const patient = await prisma.patient.create({
      data: {
        ...data,
        email: data.email || undefined,
      },
    });

    res.status(201).json({ patient });
  } catch (error) {
    next(error);
  }
});

// Update patient
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
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

    res.json({ patient });
  } catch (error) {
    next(error);
  }
});

// Archive patient (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ patient });
  } catch (error) {
    next(error);
  }
});

export default router;


