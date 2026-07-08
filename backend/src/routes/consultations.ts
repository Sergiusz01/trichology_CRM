import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { canAccessPatient } from '../middleware/authorizePatientAccess';
import { generateConsultationPDF } from '../services/pdfService';
import { writeAuditLog } from '../services/auditService';
import { prisma } from '../prisma';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const router = express.Router();

// Serve consultation scale images (public, no auth required for <img> tags)
router.get('/scales/:name', async (req: AuthRequest, res) => {
  const { name } = req.params;
  const fileMap: Record<string, string> = {
    'norwood-hamilton': 'norwood-hamilton.png',
    'norwood-hamilton.png': 'norwood-hamilton.png',
    'ludwig': 'ludwig.png',
    'ludwig.png': 'ludwig.png',
  };

  const filename = fileMap[name];
  if (!filename) {
    return res.status(404).json({ error: 'Obraz nie znaleziony' });
  }

  const candidates = [
    path.resolve(__dirname, '../assets', filename),
    path.resolve(process.cwd(), 'src/assets', filename),
    path.resolve(process.cwd(), 'backend/src/assets', filename),
  ];

  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) {
    return res.status(404).json({ error: 'Obraz nie znaleziony' });
  }

  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.sendFile(filePath);
});

// Large schema for consultation - all fields from the form
const consultationSchema = z.object({
  patientId: z.string(),
  consultationDate: z.union([
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  ]).optional(),
  templateId: z.string().optional(),
  dynamicData: z.record(z.any()).optional(), // For dynamic template-based consultations
  // 1. WYPADANIE WŁOSÓW
  hairLossSeverity: z.string().optional(),
  hairLossLocalization: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  hairLossDuration: z.string().optional(),
  hairLossShampoos: z.string().optional(),
  hairLossNotes: z.string().optional(),
  // 2. PRZETŁUSZCZANIE WŁOSÓW
  oilyHairSeverity: z.string().optional(),
  oilyHairWashingFreq: z.string().optional(),
  oilyHairDuration: z.string().optional(),
  oilyHairShampoos: z.string().optional(),
  oilyHairNotes: z.string().optional(),
  // 3. ŁUSZCZENIE SKÓRY GŁOWY
  scalingSeverity: z.string().optional(),
  scalingType: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  scalingDuration: z.string().optional(),
  scalingOther: z.string().optional(),
  // 4. WRAŻLIWOŚĆ SKÓRY GŁOWY
  sensitivitySeverity: z.string().optional(),
  sensitivityProblemType: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  sensitivityDuration: z.string().optional(),
  sensitivityOther: z.string().optional(),
  // 5. STANY ZAPALNE/GRUDKI
  inflammatoryStates: z.string().optional(),
  // WYWIAD
  familyHistory: z.string().optional(),
  dermatologyVisits: z.string().optional(),
  dermatologyVisitsReason: z.string().optional(),
  pregnancy: z.string().optional(),
  menstruationRegularity: z.string().optional(),
  contraception: z.string().optional(),
  medications: z.string().optional(),
  medicationsList: z.string().optional(),
  supplements: z.string().optional(),
  supplementsDetails: z.string().optional(),
  stressLevel: z.string().optional(),
  anesthesia: z.string().optional(),
  chemotherapy: z.string().optional(),
  radiotherapy: z.string().optional(),
  vaccination: z.string().optional(),
  antibiotics: z.string().optional(),
  antibioticsDetails: z.string().optional(),
  chronicDiseases: z.string().optional(),
  chronicDiseasesList: z.string().optional(),
  specialists: z.string().optional(),
  specialistsList: z.string().optional(),
  eatingDisorders: z.string().optional(),
  foodIntolerances: z.string().optional(),
  diet: z.string().optional(),
  allergies: z.string().optional(),
  metalPartsInBody: z.string().optional(),
  careRoutineShampoo: z.string().optional(),
  careRoutineConditioner: z.string().optional(),
  careRoutineOils: z.string().optional(),
  careRoutineChemical: z.string().optional(),
  // TRICHOSKOPIA
  scalpType: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  scalpAppearance: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  skinLesions: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  hyperhidrosis: z.string().optional(),
  hyperkeratinization: z.string().optional(),
  sebaceousSecretion: z.string().optional(),
  seborrheaType: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  seborrheaTypeOther: z.string().optional(),
  dandruffType: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  scalpPH: z.string().optional(),
  hairDamage: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  hairDamageReason: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  hairQuality: z.string().optional(),
  hairShape: z.string().optional(),
  hairTypes: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  regrowingHairs: z.string().optional(),
  vellusMiniaturizedHairs: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  // DIAGNOSTYKA
  vascularPatterns: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  perifollicularFeatures: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  scalpDiseases: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  otherDiagnostics: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  // DIAGNOSTYKA ŁYSIENIA
  alopeciaTypes: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  degreeOfThinning: z.string().optional(),
  alopeciaType: z.string().optional(),
  alopeciaAffectedAreas: z.union([z.array(z.string()), z.string()]).optional(), // Json array
  miniaturization: z.string().optional(),
  follicularUnits: z.string().optional(),
  pullTest: z.string().optional(),
  alopeciaOther: z.string().optional(),
  // Diagnosis
  diagnosis: z.string().optional(),
  // ZALECENIA DO PIELĘGNACJI
  careRecommendationsWashing: z.string().optional(),
  careRecommendationsTopical: z.string().optional(),
  careRecommendationsSupplement: z.string().optional(),
  careRecommendationsBehavior: z.string().optional(),
  // Visits/Procedures
  visitsProcedures: z.string().optional(),
  // General Remarks
  generalRemarks: z.string().optional(),
  // Scales
  norwoodHamiltonStage: z.string().optional(),
  norwoodHamiltonNotes: z.string().optional(),
  ludwigStage: z.string().optional(),
  ludwigNotes: z.string().optional(),
});
// Get all consultations (paginated, with optional search)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { limit = '25', page = '1', search = '' } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10) || 25, 100);
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // [C-1] Defence-in-depth: scope list to accessible consultations
    const user = req.user!;
    if (user.role !== 'ADMIN') {
      if (user.role === 'DOCTOR') {
        where.doctorId = user.id;
      }
      if (user.clinicId) {
        where.patient = { clinicId: user.clinicId };
      }
    }

    if (search) {
      const s = (search as string).trim();
      const searchFilter = [
        { patient: { firstName: { contains: s, mode: 'insensitive' as const } } },
        { patient: { lastName: { contains: s, mode: 'insensitive' as const } } },
      ];
      // Merge search with existing patient filter via AND
      where.AND = [
        where.patient ? { patient: where.patient } : {},
        { OR: searchFilter },
      ];
      delete where.patient;
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { consultationDate: 'desc' },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          doctor: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.consultation.count({ where }),
    ]);

    res.json({
      consultations,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// Get consultations for a patient
router.get('/patient/:patientId', authenticate, async (req: AuthRequest, res, next) => {
  const { archived = 'false' } = req.query;
  const isArchived = archived === 'true';
  try {
    const { patientId } = req.params;

    // [C-1] verify patient access before returning their consultations
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });
    if (!patient) return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    if (!(await canAccessPatient(req.user!, patient))) {
      logger.warn(`[SECURITY] Unauthorized consultation list: userId=${req.user!.id} patientId=${patientId} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tego pacjenta' });
    }

    const consultations = await prisma.consultation.findMany({
      where: {
        patientId,
        isArchived,
      },
      orderBy: { consultationDate: 'desc' },
      include: {
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ consultations });
  } catch (error) {
    next(error);
  }
});

// Generate PDF for consultation (MUST be before /:id route)
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: { include: { assignedDoctor: false } }, // includes clinicId & assignedDoctorId
        doctor: {
          select: { id: true, name: true, email: true },
        },
        template: {
          select: { id: true, name: true, fields: true },
        },
        labResults: true,
      },
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    }

    // [C-1] verify access to the patient this consultation belongs to
    if (!(await canAccessPatient(req.user!, consultation.patient as any))) {
      logger.warn(`[SECURITY] Unauthorized consultation PDF: userId=${req.user!.id} consultationId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej konsultacji' });
    }

    const pdfBuffer = await generateConsultationPDF(consultation);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="konsultacja-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    next(error);
  }
});

// Get consultation by ID (MUST be after specific routes like /patient/:patientId and /:id/pdf)
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: true, // includes clinicId & assignedDoctorId
        doctor: {
          select: { id: true, name: true, email: true },
        },
        template: {
          select: { id: true, name: true, fields: true },
        },
      },
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    }

    // [C-1] access check
    if (!(await canAccessPatient(req.user!, consultation.patient as any))) {
      logger.warn(`[SECURITY] Unauthorized consultation GET: userId=${req.user!.id} consultationId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej konsultacji' });
    }

    res.json({ consultation });
  } catch (error: any) {
    next(error);
  }
});

// Get audit logs for consultation
router.get('/:id/audit-logs', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const logs = await prisma.auditLog.findMany({
      where: {
        entity: 'Consultation',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

// Helper function to convert arrays/JSON strings to proper format for Prisma
// Prisma Json type expects JavaScript objects/arrays, not JSON strings
const prepareDataForDb = (data: any) => {
  const jsonFields = [
    'hairLossLocalization',
    'scalingType',
    'sensitivityProblemType',
    'scalpType',
    'scalpAppearance',
    'skinLesions',
    'seborrheaType',
    'dandruffType',
    'hairDamage',
    'hairDamageReason',
    'hairTypes',
    'vellusMiniaturizedHairs',
    'vascularPatterns',
    'perifollicularFeatures',
    'scalpDiseases',
    'otherDiagnostics',
    'alopeciaTypes',
    'alopeciaAffectedAreas',
  ];

  const prepared: any = {};

  // First, handle all non-JSON fields (regular string fields)
  Object.keys(data).forEach((key) => {
    // Skip JSON fields, patientId, and consultationDate (handled separately in route)
    if (!jsonFields.includes(key) && key !== 'patientId' && key !== 'consultationDate') {
      const value = data[key];

      // If it's undefined, null, or empty string, set to null
      if (value === undefined || value === null || value === '') {
        prepared[key] = null;
      }
      // If it's an array (which shouldn't happen for non-JSON fields), log warning and set to null
      else if (Array.isArray(value)) {
        logger.warn(`[prepareDataForDb] Non-JSON field ${key} is an array, setting to null`);
        prepared[key] = null;
      }
      // Otherwise keep the value as is
      else {
        prepared[key] = value;
      }
    }
  });

  // Now handle JSON fields - convert to JavaScript arrays/objects
  jsonFields.forEach((field) => {
    const value = data[field];

    if (value !== undefined && value !== null && value !== '') {
      // If it's already an array, use it directly (Prisma Json accepts arrays)
      if (Array.isArray(value)) {
        prepared[field] = value.length > 0 ? value : null;
      }
      // If it's a JSON string, parse it
      else if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          // Prisma Json expects JavaScript arrays/objects, not JSON strings
          if (Array.isArray(parsed)) {
            prepared[field] = parsed.length > 0 ? parsed : null;
          } else if (typeof parsed === 'object' && parsed !== null) {
            prepared[field] = parsed;
          } else {
            prepared[field] = null;
          }
        } catch (e) {
          // If parsing fails, it's not valid JSON - set to null
          logger.warn(`[prepareDataForDb] Failed to parse JSON for field ${field}`, { error: String(e) });
          prepared[field] = null;
        }
      }
      // If it's an object, use it directly
      else if (typeof value === 'object') {
        prepared[field] = value;
      }
      // Otherwise set to null
      else {
        prepared[field] = null;
      }
    } else {
      // If undefined, null, or empty, set to null
      prepared[field] = null;
    }
  });

  // Clean up undefined values - Prisma doesn't like them
  Object.keys(prepared).forEach((key) => {
    if (prepared[key] === undefined) {
      delete prepared[key];
    }
  });

  return prepared;
};

// Create consultation
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Parse and validate data
    let data;
    try {
      data = consultationSchema.parse(req.body);
    } catch (validationError: any) {
      return res.status(400).json({
        error: 'Błąd walidacji danych',
        details: validationError.errors,
      });
    }
    const doctorId = req.user!.id;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    }

    const preparedData = prepareDataForDb(data);

    // Handle consultationDate - convert date string to Date object
    let consultationDate = new Date();
    if (data.consultationDate) {
      // If it's a date string (YYYY-MM-DD), add time to make it valid
      if (data.consultationDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        consultationDate = new Date(data.consultationDate + 'T00:00:00');
      } else {
        consultationDate = new Date(data.consultationDate);
      }
    }

    // Handle template and dynamic data
    if (data.templateId) {
      // Verify template exists and belongs to doctor
      const template = await prisma.consultationTemplate.findFirst({
        where: {
          id: data.templateId,
          doctorId,
          isActive: true,
        },
      });

      if (!template) {
        return res.status(404).json({ error: 'Szablon nie znaleziony' });
      }

      preparedData.templateId = data.templateId;
      preparedData.dynamicData = data.dynamicData || {};
    }

    // Build final data object for Prisma
    const dataForPrisma: any = {
      ...preparedData,
      templateId: preparedData.templateId || null,
      dynamicData: preparedData.dynamicData || null,
      patientId: data.patientId,
      doctorId,
      consultationDate,
    };

    // Remove any undefined values
    Object.keys(dataForPrisma).forEach((key) => {
      if (dataForPrisma[key] === undefined) {
        delete dataForPrisma[key];
      }
    });

    const consultation = await prisma.consultation.create({
      data: dataForPrisma,
      include: {
        patient: true,
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await writeAuditLog(req, {
      action: 'CREATE_CONSULTATION',
      entity: 'Consultation',
      entityId: consultation.id,
    });

    res.status(201).json({ consultation });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Błąd walidacji danych',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Update consultation
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // [C-1] access check before any mutation
    const existing = await prisma.consultation.findUnique({
      where: { id },
      include: { patient: { select: { id: true, clinicId: true, assignedDoctorId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    if (!(await canAccessPatient(req.user!, existing.patient))) {
      logger.warn(`[SECURITY] Unauthorized consultation PUT: userId=${req.user!.id} consultationId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej konsultacji' });
    }

    const data = consultationSchema.omit({ patientId: true }).parse(req.body);

    const preparedData = prepareDataForDb(data);

    // Handle consultationDate - convert date string to Date object
    let consultationDate: Date | undefined = undefined;
    if (data.consultationDate) {
      // If it's a date string (YYYY-MM-DD), add time to make it valid
      if (data.consultationDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        consultationDate = new Date(data.consultationDate + 'T00:00:00');
      } else {
        consultationDate = new Date(data.consultationDate);
      }
    }

    // Handle template and dynamic data
    const updateData: any = {
      ...preparedData,
      consultationDate,
    };

    if (data.templateId !== undefined) {
      if (data.templateId) {
        // Verify template exists and belongs to doctor
        const doctorId = req.user!.id;
        const template = await prisma.consultationTemplate.findFirst({
          where: {
            id: data.templateId,
            doctorId,
            isActive: true,
          },
        });

        if (!template) {
          return res.status(404).json({ error: 'Szablon nie znaleziony' });
        }

        updateData.templateId = data.templateId;
        updateData.dynamicData = data.dynamicData || {};
      } else {
        // Remove template
        updateData.templateId = null;
        updateData.dynamicData = null;
      }
    }

    const consultation = await prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await writeAuditLog(req, {
      action: 'UPDATE_CONSULTATION',
      entity: 'Consultation',
      entityId: consultation.id,
    });

    res.json({ consultation });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Błąd walidacji danych',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Archive consultation (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // [C-1] access check before soft-delete
    const existing = await prisma.consultation.findUnique({
      where: { id },
      include: { patient: { select: { id: true, clinicId: true, assignedDoctorId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    if (!(await canAccessPatient(req.user!, existing.patient))) {
      logger.warn(`[SECURITY] Unauthorized consultation DELETE: userId=${req.user!.id} consultationId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej konsultacji' });
    }

    const consultation = await prisma.consultation.update({
      where: { id },
      data: { isArchived: true },
    });

    await writeAuditLog(req, {
      action: 'ARCHIVE_CONSULTATION',
      entity: 'Consultation',
      entityId: consultation.id,
    });

    res.json({
      consultation,
      message: 'Konsultacja została zarchiwizowana'
    });
  } catch (error) {
    next(error);
  }
});

// Restore archived consultation
router.post('/:id/restore', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: { patient: { select: { id: true, clinicId: true, assignedDoctorId: true } } },
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    }

    // [C-1] access check
    if (!(await canAccessPatient(req.user!, consultation.patient))) {
      logger.warn(`[SECURITY] Unauthorized consultation restore: userId=${req.user!.id} consultationId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej konsultacji' });
    }

    if (!consultation.isArchived) {
      return res.status(400).json({ error: 'Konsultacja nie jest zarchiwizowana' });
    }

    const restoredConsultation = await prisma.consultation.update({
      where: { id },
      data: { isArchived: false },
    });

    await writeAuditLog(req, {
      action: 'RESTORE_CONSULTATION',
      entity: 'Consultation',
      entityId: id,
    });

    res.json({
      consultation: restoredConsultation,
      message: 'Konsultacja została przywrócona'
    });
  } catch (error) {
    next(error);
  }
});

// Permanently delete consultation (RODO/GDPR) - ADMIN only
router.delete('/:id/permanent', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await prisma.consultation.findUnique({
      where: { id },
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    }

    // Prisma will cascade delete:
    // - labResults (onDelete: SetNull - consultationId will be set to null)
    // - scalpPhotos (onDelete: SetNull - consultationId will be set to null)
    // - carePlans (onDelete: SetNull - consultationId will be set to null)
    // - emailHistory (onDelete: SetNull - consultationId will be set to null)
    await prisma.consultation.delete({
      where: { id },
    });

    await writeAuditLog(req, {
      action: 'DELETE_CONSULTATION',
      entity: 'Consultation',
      entityId: id,
    });

    res.json({
      message: 'Konsultacja została trwale usunięta zgodnie z RODO',
      deleted: true
    });
  } catch (error) {
    next(error);
  }
});

export default router;


