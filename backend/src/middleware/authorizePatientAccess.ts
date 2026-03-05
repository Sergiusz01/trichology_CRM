/**
 * [C-1] Patient access control middleware
 *
 * Access rules:
 *   ADMIN   → full access
 *   ASSISTANT → all patients (single-clinic app; clinicId filter if set)
 *   DOCTOR  → patients assigned to them (assignedDoctorId = doctor.id)
 *             OR patients with explicit DoctorPatientAccess grant.
 *             Patients with neither are NOT visible to the doctor.
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
 * Async helper — returns true if user may access the given patient record.
 * Automatically checks the DoctorPatientAccess table for DOCTOR role.
 */
export async function canAccessPatient(
  user: { id: string; role: string; clinicId?: string | null },
  patient: PatientAccessInfo,
): Promise<boolean> {
  if (user.role === 'ADMIN') return true;

  // Clinic isolation: only enforced when BOTH sides have a clinicId set
  if (user.clinicId && patient.clinicId && user.clinicId !== patient.clinicId) {
    return false;
  }

  // DOCTOR may see patients assigned to them OR patients with explicit access grant
  if (user.role === 'DOCTOR') {
    if (patient.assignedDoctorId === user.id) return true;

    // Check explicit DoctorPatientAccess table
    const accessGrant = await prisma.doctorPatientAccess.findUnique({
      where: { doctorId_patientId: { doctorId: user.id, patientId: patient.id } },
    });
    if (accessGrant) return true;

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

    if (!(await canAccessPatient(user, patient))) {
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
