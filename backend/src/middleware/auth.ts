import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    clinicId?: string | null;  // [C-1] clinic isolation
  };
  patient?: {                   // populated by authorizePatientAccess middleware
    id: string;
    clinicId?: string | null;
    assignedDoctorId?: string | null;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // [SEC-10] Prefer httpOnly cookie; fall back to Authorization header for non-browser clients
    const cookieToken: string | undefined = req.cookies?.accessToken;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: 'Brak tokenu autoryzacyjnego' });
    }
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET nie jest ustawiony');
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      email: string;
      role: string;
    };

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, clinicId: true }, // [C-1] include clinicId
    });

    if (!user) {
      return res.status(401).json({ error: 'Użytkownik nie istnieje' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId, // [C-1]
    };

    next();
  } catch (error) {
    // TokenExpiredError extends JsonWebTokenError, so it must be checked first
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token wygasł' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Nieprawidłowy token' });
    }
    return res.status(500).json({ error: 'Błąd autoryzacji' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Brak autoryzacji' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }

    next();
  };
};

/**
 * Helper to check if user can perform write operations.
 * ASSISTANT now has the same write access as DOCTOR.
 */
export const requireWriteAccess = () => {
  return requireRole('ADMIN', 'DOCTOR', 'ASSISTANT');
};


