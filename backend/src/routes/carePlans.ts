import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { generateCarePlanPDF } from '../services/pdfService';
import { prisma } from '../prisma';

const router = express.Router();

const carePlanSchema = z.object({
  patientId: z.string(),
  consultationId: z.string().optional().nullable().transform(val => val === '' || !val ? undefined : val),
  title: z.string().min(1, 'Tytuł jest wymagany'),
  totalDurationWeeks: z.number().int().positive('Liczba tygodni musi być dodatnia'),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  weeks: z.array(z.object({
    weekNumber: z.number().int().positive(),
    description: z.string().optional().nullable(),
    washingRoutine: z.string().optional().nullable(),
    topicalProducts: z.string().optional().nullable(),
    supplements: z.string().optional().nullable(),
    inClinicProcedures: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
  })).optional(),
});

// Get care plans for a patient
router.get('/patient/:patientId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { patientId } = req.params;
    const { active, archived = 'false' } = req.query;
    const isArchived = archived === 'true';

    const where: any = { 
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

    // Verify consultation exists if provided
    let consultationId = data.consultationId;
    if (consultationId && consultationId.trim() !== '') {
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
      });
      if (!consultation) {
        return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
      }
    } else {
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

// Archive care plan (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const carePlan = await prisma.carePlan.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ 
      carePlan,
      message: 'Plan opieki został zarchiwizowany'
    });
  } catch (error) {
    next(error);
  }
});

// Restore archived care plan
router.post('/:id/restore', authenticate, async (req: AuthRequest, res, next) => {
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

    res.json({ 
      carePlan: restoredCarePlan, 
      message: 'Plan opieki został przywrócony' 
    });
  } catch (error) {
    next(error);
  }
});

// Permanently delete care plan (RODO/GDPR) - ADMIN only
router.delete('/:id/permanent', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const carePlan = await prisma.carePlan.findUnique({
      where: { id },
    });

    if (!carePlan) {
      return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
    }

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


