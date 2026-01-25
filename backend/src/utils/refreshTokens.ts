import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);

export function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiry(): Date {
  const days = Number.isFinite(REFRESH_TTL_DAYS) ? REFRESH_TTL_DAYS : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function createRefreshToken(
  prisma: PrismaClient,
  userId: string
): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
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

export async function rotateRefreshToken(
  prisma: PrismaClient,
  currentToken: string
): Promise<{ userId: string; newToken: string; newTokenId: string; expiresAt: Date } | null> {
  const tokenHash = hashToken(currentToken);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true },
  });

  if (!existing) return null;
  if (existing.revokedAt) return null;
  if (existing.expiresAt.getTime() <= Date.now()) return null;

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

export async function revokeRefreshToken(prisma: PrismaClient, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}



