"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireWriteAccess = exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Brak tokenu autoryzacyjnego' });
        }
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET nie jest ustawiony');
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Verify user still exists
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'Użytkownik nie istnieje' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ error: 'Nieprawidłowy token' });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ error: 'Token wygasł' });
        }
        return res.status(500).json({ error: 'Błąd autoryzacji' });
    }
};
exports.authenticate = authenticate;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Brak autoryzacji' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Brak uprawnień' });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Helper to check if user can perform write operations (not ASSISTANT)
 * ASSISTANT role can only read data, not create/update/delete
 */
const requireWriteAccess = () => {
    return (0, exports.requireRole)('ADMIN', 'DOCTOR');
};
exports.requireWriteAccess = requireWriteAccess;
//# sourceMappingURL=auth.js.map