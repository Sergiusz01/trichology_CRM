"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const rateLimit_1 = require("../middleware/rateLimit");
const router = express_1.default.Router();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Imię jest wymagane'),
    email: zod_1.z.string().email('Nieprawidłowy adres email'),
    password: zod_1.z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
    role: zod_1.z.enum(['ADMIN', 'DOCTOR', 'ASSISTANT']).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Nieprawidłowy adres email'),
    password: zod_1.z.string().min(1, 'Hasło jest wymagane'),
});
// Register (admin only)
router.post('/register', rateLimit_1.authLimiter, auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const data = registerSchema.parse(req.body);
        const { name, email, password, role } = data;
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Użytkownik o tym adresie email już istnieje' });
        }
        const passwordHash = await (0, password_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role || 'DOCTOR',
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        res.status(201).json({ user });
    }
    catch (error) {
        next(error);
    }
});
// Login
router.post('/login', rateLimit_1.authLimiter, async (req, res, next) => {
    try {
        const data = loginSchema.parse(req.body);
        const { email, password } = data;
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
        }
        const isValidPassword = await (0, password_1.comparePassword)(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
        }
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(tokenPayload);
        const getClientIp = (r) => r.headers['x-forwarded-for']?.split(',')[0]?.trim() || r.ip || '';
        try {
            await prisma_1.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'LOGIN',
                    entity: 'User',
                    entityId: user.id,
                    method: 'POST',
                    path: '/api/auth/login',
                    ip: getClientIp(req) || undefined,
                    userAgent: req.headers['user-agent'] || undefined,
                },
            });
        }
        catch {
            /* nie przerywaj logowania przy błędzie audytu */
        }
        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Refresh token
router.post('/refresh', rateLimit_1.refreshLimiter, async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: 'Brak tokenu odświeżającego' });
        }
        const { verifyRefreshToken } = await Promise.resolve().then(() => __importStar(require('../utils/jwt')));
        const decoded = verifyRefreshToken(refreshToken);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'Użytkownik nie istnieje' });
        }
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const newAccessToken = (0, jwt_1.generateAccessToken)(tokenPayload);
        const newRefreshToken = (0, jwt_1.generateRefreshToken)(tokenPayload);
        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch (error) {
        next(error);
    }
});
// Get current user
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
exports.default = router;
//# sourceMappingURL=auth.js.map