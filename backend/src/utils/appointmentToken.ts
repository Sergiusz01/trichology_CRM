import jwt from 'jsonwebtoken';

export type AppointmentAction = 'confirm' | 'cancel' | 'reschedule';

interface TokenPayload {
  visitId: string;
  action: AppointmentAction;
}

const getSecret = (): string => {
  const secret = process.env.TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('TOKEN_SECRET (lub JWT_SECRET) nie jest ustawiony');
  return secret;
};

const TOKEN_EXPIRY = '48h';

export function generateActionToken(visitId: string, action: AppointmentAction): string {
  return jwt.sign({ visitId, action }, getSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyActionToken(token: string): TokenPayload {
  const payload = jwt.verify(token, getSecret()) as any;
  if (!payload.visitId || !payload.action) {
    throw new Error('Nieprawidłowy format tokenu');
  }
  return { visitId: payload.visitId, action: payload.action as AppointmentAction };
}
