"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpaqueToken = generateOpaqueToken;
exports.hashToken = hashToken;
exports.getRefreshTokenExpiry = getRefreshTokenExpiry;
exports.createRefreshToken = createRefreshToken;
exports.rotateRefreshToken = rotateRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
const crypto_1 = __importDefault(require("crypto"));
const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);
function generateOpaqueToken() {
    return crypto_1.default.randomBytes(48).toString('base64url');
}
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function getRefreshTokenExpiry() {
    const days = Number.isFinite(REFRESH_TTL_DAYS) ? REFRESH_TTL_DAYS : 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
async function createRefreshToken(prisma, userId) {
    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);
    const expiresAt = getRefreshTokenExpiry();
    const created = await prisma.refreshToken.create({
        data: {
            userId,
            tokenHash,
            expiresAt,
        },
        select: { id: true, expiresAt: true },
    });
    return { token, tokenId: created.id, expiresAt: created.expiresAt };
}
async function rotateRefreshToken(prisma, currentToken) {
    const tokenHash = hashToken(currentToken);
    const existing = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
    if (!existing)
        return null;
    if (existing.revokedAt)
        return null;
    if (existing.expiresAt.getTime() <= Date.now())
        return null;
    const { token: newToken, tokenId: newTokenId, expiresAt } = await createRefreshToken(prisma, existing.userId);
    // Revoke old token and link rotation chain
    await prisma.refreshToken.update({
        where: { id: existing.id },
        data: {
            revokedAt: new Date(),
            replacedByTokenId: newTokenId,
        },
    });
    return { userId: existing.userId, newToken, newTokenId, expiresAt };
}
async function revokeRefreshToken(prisma, token) {
    const tokenHash = hashToken(token);
    await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
//# sourceMappingURL=refreshTokens.js.map