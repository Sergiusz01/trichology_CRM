import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = express.Router();

const FieldTypeEnum = z.enum(['NUMBER', 'TEXT', 'SELECT']);

const labResultFieldSchema = z.object({
  id: z.string().optional(),
  type: FieldTypeEnum,
  label: z.string().min(1, 'Etykieta jest wymagana'),
  key: z.string().min(1, 'Klucz jest wymagany').regex(/^[a-zA-Z0-9_]+$/, 'Klucz: tylko litery, cyfry, podkreślenia'),
  unit: z.string().optional(),
  refLow: z.number().optional(),
  refHigh: z.number().optional(),
  order: z.number().default(0),
  options: z.array(z.string()).optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, 'Nazwa szablonu jest wymagana'),
  fields: z.array(labResultFieldSchema).min(1, 'Szablon musi zawierać przynajmniej jedno pole'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isGlobal: z.boolean().optional(),
});

// GET / – list templates (global + current user's)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const doctorId = req.user!.id;

    const [global, mine] = await Promise.all([
      prisma.labResultTemplate.findMany({
        where: { doctorId: null, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.labResultTemplate.findMany({
        where: { doctorId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const templates = [...global, ...mine];
    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

// GET /:id
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const doctorId = req.user!.id;

    const template = await prisma.labResultTemplate.findFirst({
      where: {
        id,
        OR: [{ doctorId: null }, { doctorId }],
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Szablon nie znaleziony' });
    }

    res.json({ template });
  } catch (error) {
    next(error);
  }
});

// POST /
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const doctorId = req.user!.id;
    const data = templateSchema.parse(req.body);

    const keys = (data.fields as { key: string }[]).map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      return res.status(400).json({ error: 'Klucze pól muszą być unikalne' });
    }

    const isGlobal = !!data.isGlobal;
    const templateDoctorId = isGlobal ? null : doctorId;

    if (data.isDefault) {
      await prisma.labResultTemplate.updateMany({
        where: { OR: [{ doctorId: null }, { doctorId }] },
        data: { isDefault: false },
      });
    }

    const template = await prisma.labResultTemplate.create({
      data: {
        name: data.name,
        doctorId: templateDoctorId,
        fields: data.fields as object,
        isDefault: data.isDefault,
        isActive: data.isActive,
      },
    });

    res.status(201).json({ template });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Błąd walidacji', details: error.errors });
    }
    next(error);
  }
});

// PUT /:id
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const doctorId = req.user!.id;
    const data = templateSchema.parse(req.body);

    const existing = await prisma.labResultTemplate.findFirst({
      where: {
        id,
        OR: [{ doctorId: null }, { doctorId }],
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Szablon nie znaleziony' });
    }

    const keys = (data.fields as { key: string }[]).map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      return res.status(400).json({ error: 'Klucze pól muszą być unikalne' });
    }

    if (data.isDefault) {
      await prisma.labResultTemplate.updateMany({
        where: { OR: [{ doctorId: null }, { doctorId }], id: { not: id } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.labResultTemplate.update({
      where: { id },
      data: {
        name: data.name,
        fields: data.fields as object,
        isDefault: data.isDefault,
        isActive: data.isActive,
      },
    });

    res.json({ template });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Błąd walidacji', details: error.errors });
    }
    next(error);
  }
});

// DELETE /:id – soft delete
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const doctorId = req.user!.id;

    const existing = await prisma.labResultTemplate.findFirst({
      where: {
        id,
        OR: [{ doctorId: null }, { doctorId }],
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Szablon nie znaleziony' });
    }

    await prisma.labResultTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Szablon usunięty' });
  } catch (error) {
    next(error);
  }
});

export default router;
