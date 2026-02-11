import { PrismaClient } from '@prisma/client';
export declare function generateOpaqueToken(): string;
export declare function hashToken(token: string): string;
export declare function getRefreshTokenExpiry(): Date;
export declare function createRefreshToken(prisma: PrismaClient, userId: string): Promise<{
    token: string;
    tokenId: string;
    expiresAt: Date;
}>;
export declare function rotateRefreshToken(prisma: PrismaClient, currentToken: string): Promise<{
    userId: string;
    newToken: string;
    newTokenId: string;
    expiresAt: Date;
} | null>;
export declare function revokeRefreshToken(prisma: PrismaClient, token: string): Promise<void>;
//# sourceMappingURL=refreshTokens.d.ts.map