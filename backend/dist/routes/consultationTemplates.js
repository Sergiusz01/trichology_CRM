"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
// Field type enum
const FieldTypeEnum = zod_1.z.enum(['TEXT', 'TEXTAREA', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'NUMBER', 'DATE', 'SECTION', 'SUBSECTION', 'IMAGE_SELECT']);
// Field schema
const fieldSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: FieldTypeEnum,
    label: zod_1.z.string().min(1, 'Etykieta jest wymagana'),
    key: zod_1.z.string().min(1, 'Klucz jest wymagany'),
    required: zod_1.z.boolean().default(false),
    placeholder: zod_1.z.string().optional(),
    options: zod_1.z.array(zod_1.z.string()).optional(), // For SELECT and MULTISELECT
    defaultValue: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())]).optional(),
    order: zod_1.z.number().default(0),
});
// Template schema
const templateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nazwa szablonu jest wymagana'),
    fields: zod_1.z.array(fieldSchema).min(1, 'Szablon musi zawierać przynajmniej jedno pole'),
    isDefault: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
// Get all templates for current doctor
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const userEmail = req.user.email;
        console.log('[GET /consultation-templates] Doctor ID:', doctorId, 'Email:', userEmail);
        // First check if doctor has any templates
        const doctorTemplates = await prisma_1.prisma.consultationTemplate.findMany({
            where: {
                doctorId,
                isActive: true,
            },
        });
        console.log('[GET /consultation-templates] Templates for this doctor:', doctorTemplates.length);
        // If no templates, check if there's a default template for any doctor and copy it
        if (doctorTemplates.length === 0) {
            console.log('[GET /consultation-templates] No templates found for doctor, checking for default template...');
            const defaultTemplate = await prisma_1.prisma.consultationTemplate.findFirst({
                where: {
                    isDefault: true,
                    isActive: true,
                },
            });
            if (defaultTemplate) {
                console.log('[GET /consultation-templates] Found default template, creating copy for this doctor...');
                // Create a copy of default template for this doctor
                await prisma_1.prisma.consultationTemplate.create({
                    data: {
                        name: defaultTemplate.name,
                        doctorId: doctorId,
                        fields: defaultTemplate.fields,
                        isDefault: true,
                        isActive: true,
                    },
                });
                console.log('[GET /consultation-templates] Default template copied for doctor');
            }
        }
        // Now fetch templates again
        const templates = await prisma_1.prisma.consultationTemplate.findMany({
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
    }
    catch (error) {
        console.error('[GET /consultation-templates] Error:', error);
        next(error);
    }
});
// Get single template
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;
        const template = await prisma_1.prisma.consultationTemplate.findFirst({
            where: {
                id,
                doctorId,
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Szablon nie znaleziony' });
        }
        res.json({ template });
    }
    catch (error) {
        next(error);
    }
});
// Create template
router.post('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const data = templateSchema.parse(req.body);
        // If setting as default, unset other defaults
        if (data.isDefault) {
            await prisma_1.prisma.consultationTemplate.updateMany({
                where: { doctorId, isDefault: true },
                data: { isDefault: false },
            });
        }
        const template = await prisma_1.prisma.consultationTemplate.create({
            data: {
                name: data.name,
                fields: data.fields,
                isDefault: data.isDefault,
                isActive: data.isActive,
                doctorId,
            },
        });
        res.status(201).json({ template });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Błąd walidacji',
                details: error.errors,
            });
        }
        next(error);
    }
});
// Update template
router.put('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;
        // Verify template belongs to doctor
        const existing = await prisma_1.prisma.consultationTemplate.findFirst({
            where: { id, doctorId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Szablon nie znaleziony' });
        }
        const data = templateSchema.parse(req.body);
        // If setting as default, unset other defaults
        if (data.isDefault) {
            await prisma_1.prisma.consultationTemplate.updateMany({
                where: { doctorId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }
        const template = await prisma_1.prisma.consultationTemplate.update({
            where: { id },
            data: {
                name: data.name,
                fields: data.fields,
                isDefault: data.isDefault,
                isActive: data.isActive,
            },
        });
        res.json({ template });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Błąd walidacji',
                details: error.errors,
            });
        }
        next(error);
    }
});
// Delete template
router.delete('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;
        // Verify template belongs to doctor
        const existing = await prisma_1.prisma.consultationTemplate.findFirst({
            where: { id, doctorId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Szablon nie znaleziony' });
        }
        // Soft delete by setting isActive to false
        await prisma_1.prisma.consultationTemplate.update({
            where: { id },
            data: { isActive: false },
        });
        res.json({ message: 'Szablon usunięty' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=consultationTemplates.js.map