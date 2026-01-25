import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { initializeDefaultTemplates } from '../utils/initializeDefaultTemplates';

const router = express.Router();
const prisma = new PrismaClient();

const emailTemplateSchema = z.object({
  name: z.string().min(1, 'Nazwa szablonu jest wymagana'),
  type: z.enum(['CONSULTATION', 'CARE_PLAN', 'LAB_RESULT', 'CUSTOM']),
  subject: z.string().min(1, 'Temat jest wymagany'),
  htmlBody: z.string().min(1, 'Treść HTML jest wymagana'),

  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Get all email templates
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { type, active } = req.query;

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { type: 'asc' },
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

// Get email template by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
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

// Get default template for type
router.get('/type/:type/default', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { type } = req.params;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        type: type as any,
        isDefault: true,
        isActive: true,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Domyślny szablon nie znaleziony' });
    }

    res.json({ template });
  } catch (error) {
    next(error);
  }
});

// Create email template
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = emailTemplateSchema.parse(req.body);
    const createdByUserId = req.user!.id;

    // If setting as default, unset other defaults of the same type
    if (data.isDefault) {
      await prisma.emailTemplate.updateMany({
        where: {
          type: data.type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        ...data,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
        createdByUserId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
});

// Update email template
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = emailTemplateSchema.parse(req.body);

    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Szablon nie znaleziony' });
    }

    // If setting as default, unset other defaults of the same type
    if (data.isDefault && !existingTemplate.isDefault) {
      await prisma.emailTemplate.updateMany({
        where: {
          type: data.type,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        subject: data.subject,
        htmlBody: data.htmlBody,
        isDefault: data.isDefault ?? existingTemplate.isDefault,
        isActive: data.isActive ?? existingTemplate.isActive,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ template });
  } catch (error) {
    next(error);
  }
});

// Delete email template
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Szablon nie znaleziony' });
    }

    await prisma.emailTemplate.delete({
      where: { id },
    });

    res.json({ message: 'Szablon został usunięty' });
  } catch (error) {
    next(error);
  }
});

// Initialize default templates endpoint (ADMIN only)
router.post('/initialize-defaults', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    await initializeDefaultTemplates(req.user!.id, prisma);
    res.json({ message: 'Domyślne szablony zostały zainicjalizowane' });
  } catch (error) {
    next(error);
  }
});

export default router;

