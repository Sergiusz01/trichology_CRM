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
const FieldTypeEnum = zod_1.z.enum(['NUMBER', 'TEXT', 'SELECT']);
const labResultFieldSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: FieldTypeEnum,
    label: zod_1.z.string().min(1, 'Etykieta jest wymagana'),
    key: zod_1.z.string().min(1, 'Klucz jest wymagany').regex(/^[a-zA-Z0-9_]+$/, 'Klucz: tylko litery, cyfry, podkreślenia'),
    unit: zod_1.z.string().optional(),
    refLow: zod_1.z.number().optional(),
    refHigh: zod_1.z.number().optional(),
    order: zod_1.z.number().default(0),
    options: zod_1.z.array(zod_1.z.string()).optional(),
});
const templateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nazwa szablonu jest wymagana'),
    fields: zod_1.z.array(labResultFieldSchema).min(1, 'Szablon musi zawierać przynajmniej jedno pole'),
    isDefault: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
    isGlobal: zod_1.z.boolean().optional(),
});
// GET / – list templates (global + current user's)
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const [global, mine] = await Promise.all([
            prisma_1.prisma.labResultTemplate.findMany({
                where: { doctorId: null, isActive: true },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma_1.prisma.labResultTemplate.findMany({
                where: { doctorId, isActive: true },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
            }),
        ]);
        const templates = [...global, ...mine];
        res.json({ templates });
    }
    catch (error) {
        next(error);
    }
});
// GET /:id
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;
        const template = await prisma_1.prisma.labResultTemplate.findFirst({
            where: {
                id,
                OR: [{ doctorId: null }, { doctorId }],
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
// POST /
router.post('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const data = templateSchema.parse(req.body);
        const keys = data.fields.map((f) => f.key);
        if (new Set(keys).size !== keys.length) {
            return res.status(400).json({ error: 'Klucze pól muszą być unikalne' });
        }
        const isGlobal = !!data.isGlobal;
        const templateDoctorId = isGlobal ? null : doctorId;
        if (data.isDefault) {
            await prisma_1.prisma.labResultTemplate.updateMany({
                where: { OR: [{ doctorId: null }, { doctorId }] },
                data: { isDefault: false },
            });
        }
        const template = await prisma_1.prisma.labResultTemplate.create({
            data: {
                name: data.name,
                doctorId: templateDoctorId,
                fields: data.fields,
                isDefault: data.isDefault,
                isActive: data.isActive,
            },
        });
        res.status(201).json({ template });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Błąd walidacji', details: error.errors });
        }
        next(error);
    }
});
// PUT /:id
router.put('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;
        const data = templateSchema.parse(req.body);
        const existing = await prisma_1.prisma.labResultTemplate.findFirst({
            where: {
                id,
                OR: [{ doctorId: null }, { doctorId }],
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Szablon nie znaleziony' });
        }
        const keys = data.fields.map((f) => f.key);
        if (new Set(keys).size !== keys.length) {
            return res.status(400).json({ error: 'Klucze pól muszą być unikalne' });
        }
        if (data.isDefault) {
            await prisma_1.prisma.labResultTemplate.updateMany({
                where: { OR: [{ doctorId: null }, { doctorId }], id: { not: id } },
                data: { isDefault: false },
            });
        }
        const template = await prisma_1.prisma.labResultTemplate.update({
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
            return res.status(400).json({ error: 'Błąd walidacji', details: error.errors });
        }
        next(error);
    }
});
// DELETE /:id – soft delete
router.delete('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;
        const existing = await prisma_1.prisma.labResultTemplate.findFirst({
            where: {
                id,
                OR: [{ doctorId: null }, { doctorId }],
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Szablon nie znaleziony' });
        }
        await prisma_1.prisma.labResultTemplate.update({
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
//# sourceMappingURL=labResultTemplates.js.map