/**
 * Appointment Action Token Service
 *
 * Generates and verifies signed JWT tokens for patient email actions
 * (confirm, cancel, reschedule request). Tokens expire after 48h.
 */
import jwt from 'jsonwebtoken';

export type AppointmentAction = 'confirm' | 'cancel' | 'reschedule';

interface ActionTokenPayload {
    visitId: string;
    action: AppointmentAction;
}

const getTokenSecret = (): string => {
    const secret = process.env.TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('TOKEN_SECRET (or JWT_SECRET fallback) is not set');
    return secret;
};

/**
 * Generate a signed action token for a patient email link.
 */
export function generateActionToken(visitId: string, action: AppointmentAction): string {
    return jwt.sign(
        { visitId, action } as ActionTokenPayload,
        getTokenSecret(),
        { expiresIn: '48h' },
    );
}

/**
 * Verify and decode an action token.
 * Throws if expired, tampered, or malformed.
 */
export function verifyActionToken(token: string): ActionTokenPayload {
    const decoded = jwt.verify(token, getTokenSecret()) as ActionTokenPayload;
    if (!decoded.visitId || !decoded.action) {
        throw new Error('Invalid token payload');
    }
    if (!['confirm', 'cancel', 'reschedule'].includes(decoded.action)) {
        throw new Error('Invalid action in token');
    }
    return decoded;
}
