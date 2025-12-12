import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { calculateLabFlags } from '../utils/labResults';
import { generateLabResultPDF } from '../services/pdfService';

const router = express.Router();
const prisma = new PrismaClient();

const labResultSchema = z.object({
  patientId: z.string(),
  consultationId: z.string().optional(),
  date: z.string().datetime().optional(),
  // Morphology
  hgb: z.number().optional(),
  hgbUnit: z.string().optional(),
  hgbRefLow: z.number().optional(),
  hgbRefHigh: z.number().optional(),
  rbc: z.number().optional(),
  rbcUnit: z.string().optional(),
  rbcRefLow: z.number().optional(),
  rbcRefHigh: z.number().optional(),
  wbc: z.number().optional(),
  wbcUnit: z.string().optional(),
  wbcRefLow: z.number().optional(),
  wbcRefHigh: z.number().optional(),
  plt: z.number().optional(),
  pltUnit: z.string().optional(),
  pltRefLow: z.number().optional(),
  pltRefHigh: z.number().optional(),
  // Inflammatory
  crp: z.number().optional(),
  crpUnit: z.string().optional(),
  crpRefLow: z.number().optional(),
  crpRefHigh: z.number().optional(),
  // Iron
  iron: z.number().optional(),
  ironUnit: z.string().optional(),
  ironRefLow: z.number().optional(),
  ironRefHigh: z.number().optional(),
  ferritin: z.number().optional(),
  ferritinUnit: z.string().optional(),
  ferritinRefLow: z.number().optional(),
  ferritinRefHigh: z.number().optional(),
  // Vitamins
  vitaminD3: z.number().optional(),
  vitaminD3Unit: z.string().optional(),
  vitaminD3RefLow: z.number().optional(),
  vitaminD3RefHigh: z.number().optional(),
  vitaminB12: z.number().optional(),
  vitaminB12Unit: z.string().optional(),
  vitaminB12RefLow: z.number().optional(),
  vitaminB12RefHigh: z.number().optional(),
  folicAcid: z.number().optional(),
  folicAcidUnit: z.string().optional(),
  folicAcidRefLow: z.number().optional(),
  folicAcidRefHigh: z.number().optional(),
  // Thyroid
  tsh: z.number().optional(),
  tshUnit: z.string().optional(),
  tshRefLow: z.number().optional(),
  tshRefHigh: z.number().optional(),
  ft3: z.number().optional(),
  ft3Unit: z.string().optional(),
  ft3RefLow: z.number().optional(),
  ft3RefHigh: z.number().optional(),
  ft4: z.number().optional(),
  ft4Unit: z.string().optional(),
  ft4RefLow: z.number().optional(),
  ft4RefHigh: z.number().optional(),
  antiTPO: z.number().optional(),
  antiTPOUnit: z.string().optional(),
  antiTPORefLow: z.number().optional(),
  antiTPORefHigh: z.number().optional(),
  antiTG: z.number().optional(),
  antiTGUnit: z.string().optional(),
  antiTGRefLow: z.number().optional(),
  antiTGRefHigh: z.number().optional(),
  trab: z.number().optional(),
  trabUnit: z.string().optional(),
  trabRefLow: z.number().optional(),
  trabRefHigh: z.number().optional(),
  // Hormones
  estrogen: z.number().optional(),
  estrogenUnit: z.string().optional(),
  estrogenRefLow: z.number().optional(),
  estrogenRefHigh: z.number().optional(),
  progesterone: z.number().optional(),
  progesteroneUnit: z.string().optional(),
  progesteroneRefLow: z.number().optional(),
  progesteroneRefHigh: z.number().optional(),
  testosterone: z.number().optional(),
  testosteroneUnit: z.string().optional(),
  testosteroneRefLow: z.number().optional(),
  testosteroneRefHigh: z.number().optional(),
  dheas: z.number().optional(),
  dheasUnit: z.string().optional(),
  dheasRefLow: z.number().optional(),
  dheasRefHigh: z.number().optional(),
  prolactin: z.number().optional(),
  prolactinUnit: z.string().optional(),
  prolactinRefLow: z.number().optional(),
  prolactinRefHigh: z.number().optional(),
  // Glucose/Insulin
  glucose: z.number().optional(),
  glucoseUnit: z.string().optional(),
  glucoseRefLow: z.number().optional(),
  glucoseRefHigh: z.number().optional(),
  insulin: z.number().optional(),
  insulinUnit: z.string().optional(),
  insulinRefLow: z.number().optional(),
  insulinRefHigh: z.number().optional(),
  homaIR: z.number().optional(),
  homaIRRefLow: z.number().optional(),
  homaIRRefHigh: z.number().optional(),
  hba1c: z.number().optional(),
  hba1cUnit: z.string().optional(),
  hba1cRefLow: z.number().optional(),
  hba1cRefHigh: z.number().optional(),
  notes: z.string().optional(),
});

// Get lab results for a patient
router.get('/patient/:patientId', authenticate, async (req: AuthRequest, res, next) => {
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
  } catch (error) {
    next(error);
  }
});

// Generate PDF for lab result
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res, next) => {
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

    const pdfBuffer = await generateLabResultPDF(labResult, labResult.patient);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="wynik-badan-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// Get lab result by ID (MUST be after specific routes like /:id/pdf)
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
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
  } catch (error) {
    next(error);
  }
});

// Create lab result
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
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
    const labDataWithFlags = calculateLabFlags(data);

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

    res.status(201).json({ labResult });
  } catch (error) {
    next(error);
  }
});

// Update lab result
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = labResultSchema.omit({ patientId: true }).parse(req.body);

    // Calculate flags
    const labDataWithFlags = calculateLabFlags(data);

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

    res.json({ labResult });
  } catch (error) {
    next(error);
  }
});

// Archive lab result (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const labResult = await prisma.labResult.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ 
      labResult,
      message: 'Wynik badania został zarchiwizowany'
    });
  } catch (error) {
    next(error);
  }
});

// Restore archived lab result
router.post('/:id/restore', authenticate, async (req: AuthRequest, res, next) => {
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

    res.json({ 
      labResult: restoredLabResult, 
      message: 'Wynik badania został przywrócony' 
    });
  } catch (error) {
    next(error);
  }
});

// Permanently delete lab result (RODO/GDPR) - ADMIN only
router.delete('/:id/permanent', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const labResult = await prisma.labResult.findUnique({
      where: { id },
    });

    if (!labResult) {
      return res.status(404).json({ error: 'Wynik badania nie znaleziony' });
    }

    // Permanent delete - RODO compliant
    await prisma.labResult.delete({
      where: { id },
    });

    res.json({ 
      message: 'Wynik badania został trwale usunięty zgodnie z RODO',
      deleted: true
    });
  } catch (error) {
    next(error);
  }
});

export default router;


