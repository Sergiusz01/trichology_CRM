/**
 * [C-1] Patient access control middleware
 *
 * Access rules:
 *   ADMIN   → full access
 *   ASSISTANT → restricted to own clinic (if clinicId set)
 *   DOCTOR  → restricted to own clinic AND only their assigned patients
 *             (patients with assignedDoctorId = null are accessible to all clinic members)
 */
import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth';

interface PatientAccessInfo {
  id: string;
  clinicId?: string | null;
  assignedDoctorId?: string | null;
}

/**
 * Pure helper — returns true if user may access the given patient record.
 * Reusable from within route handlers (e.g. consultation, visit routes).
 */
export function canAccessPatient(
  user: { id: string; role: string; clinicId?: string | null },
  patient: PatientAccessInfo,
): boolean {
  if (user.role === 'ADMIN') return true;

  // Clinic isolation: only enforced when BOTH sides have a clinicId set
  if (user.clinicId && patient.clinicId && user.clinicId !== patient.clinicId) {
    return false;
  }

  // DOCTOR may only see patients explicitly assigned to them.
  // Unassigned patients (assignedDoctorId = null) are visible to all clinic members.
  if (
    user.role === 'DOCTOR' &&
    patient.assignedDoctorId !== null &&
    patient.assignedDoctorId !== undefined &&
    patient.assignedDoctorId !== user.id
  ) {
    return false;
  }

  return true;
}

/**
 * Express middleware — reads patientId from params/body, fetches from DB,
 * checks access rules, attaches patient to req.patient and calls next().
 *
 * Usage:  router.get('/:id', authenticate, authorizePatientAccess, handler)
 *
 * The middleware tries params in order: patientId → id → body.patientId.
 * If no patientId can be resolved it just calls next() (non-patient routes).
 */
export async function authorizePatientAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const patientId =
    req.params.patientId ?? req.params.id ?? req.body?.patientId ?? undefined;

  if (!patientId) return next();

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    }

    const user = req.user!;
    if (!canAccessPatient(user, patient)) {
      console.warn(
        `[SECURITY] Unauthorized patient access: userId=${user.id} role=${user.role} ` +
          `patientId=${patientId} ip=${req.ip}`,
      );
      return res.status(403).json({ error: 'Brak dostępu do tego pacjenta' });
    }

    req.patient = patient;
    next();
  } catch (err) {
    next(err);
  }
}
