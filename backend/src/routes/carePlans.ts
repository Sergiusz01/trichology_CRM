import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateCarePlanPDF } from '../services/pdfService';

const router = express.Router();
const prisma = new PrismaClient();

const carePlanSchema = z.object({
  patientId: z.string(),
  consultationId: z.string().optional(),
  title: z.string().min(1, 'Tytuł jest wymagany'),
  totalDurationWeeks: z.number().int().positive('Liczba tygodni musi być dodatnia'),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  weeks: z.array(z.object({
    weekNumber: z.number().int().positive(),
    description: z.string().optional(),
    washingRoutine: z.string().optional(),
    topicalProducts: z.string().optional(),
    supplements: z.string().optional(),
    inClinicProcedures: z.string().optional(),
    remarks: z.string().optional(),
  })).optional(),
});

// Get care plans for a patient
router.get('/patient/:patientId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { patientId } = req.params;
    const { active } = req.query;

    const where: any = { patientId };
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
  } catch (error) {
    next(error);
  }
});

// Get care plan by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
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
  } catch (error) {
    next(error);
  }
});

// Create care plan
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = carePlanSchema.parse(req.body);
    const createdByUserId = req.user!.id;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    }

    const { weeks, ...planData } = data;

    const carePlan = await prisma.carePlan.create({
      data: {
        ...planData,
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

    res.status(201).json({ carePlan });
  } catch (error) {
    next(error);
  }
});

// Update care plan
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
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

    res.json({ carePlan: updatedPlan });
  } catch (error) {
    next(error);
  }
});

// Delete care plan
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    await prisma.carePlan.delete({
      where: { id },
    });

    res.json({ message: 'Plan opieki usunięty' });
  } catch (error) {
    next(error);
  }
});

// Generate PDF for care plan
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

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

    const pdfBuffer = await generateCarePlanPDF(carePlan);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="plan-opieki-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;


