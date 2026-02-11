"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const password_1 = require("../utils/password");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Imię jest wymagane').optional(),
    email: zod_1.z.string().email('Nieprawidłowy adres email').optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Aktualne hasło jest wymagane'),
    newPassword: zod_1.z.string().min(6, 'Nowe hasło musi mieć co najmniej 6 znaków'),
});
// Get current user profile
router.get('/me', auth_1.authenticate, async (req, res, next) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
});
// Update user profile (name, email)
router.put('/me', auth_1.authenticate, async (req, res, next) => {
    try {
        const data = updateProfileSchema.parse(req.body);
        const userId = req.user.id;
        // Check if email is already taken by another user
        if (data.email) {
            const existingUser = await prisma_1.prisma.user.findFirst({
                where: {
                    email: data.email,
                    id: { not: userId },
                },
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Adres email jest już używany przez innego użytkownika' });
            }
        }
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.email)
            updateData.email = data.email;
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json({ user, message: 'Profil został zaktualizowany' });
    }
    catch (error) {
        next(error);
    }
});
// Change password
router.post('/me/change-password', auth_1.authenticate, async (req, res, next) => {
    try {
        const data = changePasswordSchema.parse(req.body);
        const userId = req.user.id;
        // Get current user with password hash
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                passwordHash: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }
        // Verify current password
        const isPasswordValid = await (0, password_1.comparePassword)(data.currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Aktualne hasło jest nieprawidłowe' });
        }
        // Hash new password
        const newPasswordHash = await (0, password_1.hashPassword)(data.newPassword);
        // Update password
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
            },
        });
        res.json({ message: 'Hasło zostało zmienione' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=userProfile.js.map