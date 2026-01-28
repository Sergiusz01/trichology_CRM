import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = express.Router();

// Field type enum
const FieldTypeEnum = z.enum(['TEXT', 'TEXTAREA', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'NUMBER', 'DATE']);

// Field schema
const fieldSchema = z.object({
  id: z.string().optional(),
  type: FieldTypeEnum,
  label: z.string().min(1, 'Etykieta jest wymagana'),
  key: z.string().min(1, 'Klucz jest wymagany'),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(), // For SELECT and MULTISELECT
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  order: z.number().default(0),
});

// Template schema
const templateSchema = z.object({
  name: z.string().min(1, 'Nazwa szablonu jest wymagana'),
  fields: z.array(fieldSchema).min(1, 'Szablon musi zawierać przynajmniej jedno pole'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Get all templates for current doctor
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const doctorId = req.user!.id;
    const userEmail = req.user!.email;
    console.log('[GET /consultation-templates] Doctor ID:', doctorId, 'Email:', userEmail);
    
    // First check if doctor has any templates
    const doctorTemplates = await prisma.consultationTemplate.findMany({
      where: {
        doctorId,
        isActive: true,
      },
    });
    console.log('[GET /consultation-templates] Templates for this doctor:', doctorTemplates.length);
    
    // If no templates, check if there's a default template for any doctor and copy it
    if (doctorTemplates.length === 0) {
      console.log('[GET /consultation-templates] No templates found for doctor, checking for default template...');
      const defaultTemplate = await prisma.consultationTemplate.findFirst({
        where: {
          isDefault: true,
          isActive: true,
        },
      });
      
      if (defaultTemplate) {
        console.log('[GET /consultation-templates] Found default template, creating copy for this doctor...');
        // Create a copy of default template for this doctor
        await prisma.consultationTemplate.create({
          data: {
            name: defaultTemplate.name,
            doctorId: doctorId,
            fields: defaultTemplate.fields as any,
            isDefault: true,
            isActive: true,
          },
        });
        console.log('[GET /consultation-templates] Default template copied for doctor');
      }
    }
    
    // Now fetch templates again
    const templates = await prisma.consultationTemplate.findMany({
      where: {
        doctorId,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    console.log('[GET /consultation-templates] Returning templates:', templates.length);
    templates.forEach(t => {
      console.log(`[GET /consultation-templates] Template: ${t.name}, isDefault: ${t.isDefault}, doctorId: ${t.doctorId}, fields: ${Array.isArray(t.fields) ? t.fields.length : 0}`);
    });

    res.json({ templates });
  } catch (error) {
    console.error('[GET /consultation-templates] Error:', error);
    next(error);
  }
});

// Get single template
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const doctorId = req.user!.id;

    const template = await prisma.consultationTemplate.findFirst({
      where: {
        id,
        doctorId,
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

// Create template
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const doctorId = req.user!.id;
    
    const data = templateSchema.parse(req.body);

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.consultationTemplate.updateMany({
        where: { doctorId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.consultationTemplate.create({
      data: {
        name: data.name,
        fields: data.fields as any,
        isDefault: data.isDefault,
        isActive: data.isActive,
        doctorId,
      },
    });

    res.status(201).json({ template });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Błąd walidacji',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Update template
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const doctorId = req.user!.id;

    // Verify template belongs to doctor
    const existing = await prisma.consultationTemplate.findFirst({
      where: { id, doctorId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Szablon nie znaleziony' });
    }

    const data = templateSchema.parse(req.body);

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.consultationTemplate.updateMany({
        where: { doctorId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.consultationTemplate.update({
      where: { id },
      data: {
        name: data.name,
        fields: data.fields as any,
        isDefault: data.isDefault,
        isActive: data.isActive,
      },
    });

    res.json({ template });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Błąd walidacji',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Delete template
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const doctorId = req.user!.id;

    // Verify template belongs to doctor
    const existing = await prisma.consultationTemplate.findFirst({
      where: { id, doctorId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Szablon nie znaleziony' });
    }

    // Soft delete by setting isActive to false
    await prisma.consultationTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Szablon usunięty' });
  } catch (error) {
    next(error);
  }
});

export default router;
