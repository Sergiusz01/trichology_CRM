"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const initializeDefaultTemplates_1 = require("../utils/initializeDefaultTemplates");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
const emailTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nazwa szablonu jest wymagana'),
    type: zod_1.z.enum(['CONSULTATION', 'CARE_PLAN', 'LAB_RESULT', 'CUSTOM']),
    subject: zod_1.z.string().min(1, 'Temat jest wymagany'),
    htmlBody: zod_1.z.string().min(1, 'Treść HTML jest wymagana'),
    isDefault: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
});
// Get all email templates
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const { type, active } = req.query;
        const where = {};
        if (type) {
            where.type = type;
        }
        if (active !== undefined) {
            where.isActive = active === 'true';
        }
        const templates = await prisma_1.prisma.emailTemplate.findMany({
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
    }
    catch (error) {
        next(error);
    }
});
// Get email template by ID
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await prisma_1.prisma.emailTemplate.findUnique({
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
    }
    catch (error) {
        next(error);
    }
});
// Get default template for type
router.get('/type/:type/default', auth_1.authenticate, async (req, res, next) => {
    try {
        const { type } = req.params;
        const template = await prisma_1.prisma.emailTemplate.findFirst({
            where: {
                type: type,
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
    }
    catch (error) {
        next(error);
    }
});
// Create email template
router.post('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const data = emailTemplateSchema.parse(req.body);
        const createdByUserId = req.user.id;
        // If setting as default, unset other defaults of the same type
        if (data.isDefault) {
            await prisma_1.prisma.emailTemplate.updateMany({
                where: {
                    type: data.type,
                    isDefault: true,
                },
                data: {
                    isDefault: false,
                },
            });
        }
        const template = await prisma_1.prisma.emailTemplate.create({
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
    }
    catch (error) {
        next(error);
    }
});
// Update email template
router.put('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = emailTemplateSchema.parse(req.body);
        const existingTemplate = await prisma_1.prisma.emailTemplate.findUnique({
            where: { id },
        });
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Szablon nie znaleziony' });
        }
        // If setting as default, unset other defaults of the same type
        if (data.isDefault && !existingTemplate.isDefault) {
            await prisma_1.prisma.emailTemplate.updateMany({
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
        const template = await prisma_1.prisma.emailTemplate.update({
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
    }
    catch (error) {
        next(error);
    }
});
// Delete email template
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await prisma_1.prisma.emailTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            return res.status(404).json({ error: 'Szablon nie znaleziony' });
        }
        await prisma_1.prisma.emailTemplate.delete({
            where: { id },
        });
        res.json({ message: 'Szablon został usunięty' });
    }
    catch (error) {
        next(error);
    }
});
// Initialize default templates endpoint (ADMIN only)
router.post('/initialize-defaults', auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        await (0, initializeDefaultTemplates_1.initializeDefaultTemplates)(req.user.id, prisma_1.prisma);
        res.json({ message: 'Domyślne szablony zostały zainicjalizowane' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=emailTemplates.js.map