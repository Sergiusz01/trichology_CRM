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
const phoneRegex = /^[+\d\s\-().]{7,20}$/;
const settingsSchema = zod_1.z.object({
    clinicPhone: zod_1.z
        .string()
        .optional()
        .nullable()
        .refine((v) => !v || phoneRegex.test(v), { message: 'Nieprawidłowy format numeru telefonu' }),
});
// GET /api/specialist-settings — get current user's settings
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const settings = await prisma_1.prisma.specialistSettings.findUnique({
            where: { specialistId: req.user.id },
        });
        res.json({ settings: settings || { specialistId: req.user.id, clinicPhone: null } });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/specialist-settings — upsert current user's settings
router.put('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const data = settingsSchema.parse(req.body);
        const settings = await prisma_1.prisma.specialistSettings.upsert({
            where: { specialistId: req.user.id },
            create: { specialistId: req.user.id, clinicPhone: data.clinicPhone ?? null },
            update: { clinicPhone: data.clinicPhone ?? null },
        });
        res.json({ settings });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=specialistSettings.js.map