import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = express.Router();

const phoneRegex = /^[+\d\s\-().]{7,20}$/;

const settingsSchema = z.object({
  clinicPhone: z
    .string()
    .optional()
    .nullable()
    .refine(
      (v) => !v || phoneRegex.test(v),
      { message: 'Nieprawidłowy format numeru telefonu' },
    ),
});

// GET /api/specialist-settings — get current user's settings
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.specialistSettings.findUnique({
      where: { specialistId: req.user!.id },
    });
    res.json({ settings: settings || { specialistId: req.user!.id, clinicPhone: null } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/specialist-settings — upsert current user's settings
router.put('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = settingsSchema.parse(req.body);

    const settings = await prisma.specialistSettings.upsert({
      where: { specialistId: req.user!.id },
      create: { specialistId: req.user!.id, clinicPhone: data.clinicPhone ?? null },
      update: { clinicPhone: data.clinicPhone ?? null },
    });

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

export default router;
