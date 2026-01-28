import express from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { generateConsultationPDF } from '../services/pdfService';
import { prisma } from '../prisma';

const router = express.Router();

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
  // 2. PRZETŁUSZCZANIE WŁOSÓW
  oilyHairSeverity: z.string().optional(),
  oilyHairWashingFreq: z.string().optional(),
  oilyHairDuration: z.string().optional(),
  oilyHairShampoos: z.string().optional(),
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
  stressLevel: z.string().optional(),
  anesthesia: z.string().optional(),
  chemotherapy: z.string().optional(),
  radiotherapy: z.string().optional(),
  vaccination: z.string().optional(),
  antibiotics: z.string().optional(),
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
// Get all consultations (for dashboard and reports)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { limit = '100' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    const consultations = await prisma.consultation.findMany({
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
    });

    res.json({ consultations });
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
        patient: true,
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    }

    console.log(`Generowanie PDF dla konsultacji ${id}...`);
    const pdfBuffer = await generateConsultationPDF(consultation);
    console.log(`PDF wygenerowany pomyślnie dla konsultacji ${id}, rozmiar: ${pdfBuffer.length} bajtów`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="konsultacja-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Błąd w endpoint PDF konsultacji:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
});

// Get consultation by ID (MUST be after specific routes like /patient/:patientId and /:id/pdf)
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    console.log(`[GET /consultations/:id] Request - ID: ${id}, User: ${userId}, Path: ${req.path}`);

    // First check if consultation exists
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          select: { id: true, name: true, email: true },
        },
        template: {
          select: { id: true, name: true, fields: true },
        },
      },
    });

    if (!consultation) {
      console.log(`[GET /consultations/:id] Consultation not found - ID: ${id}`);
      // Check if any consultations exist at all
      const count = await prisma.consultation.count();
      console.log(`[GET /consultations/:id] Total consultations in DB: ${count}`);
      return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    }

    console.log(`[GET /consultations/:id] Consultation found - ID: ${consultation.id}, Patient: ${consultation.patientId}`);
    res.json({ consultation });
  } catch (error: any) {
    console.error('[GET /consultations/:id] Error:', error.message, error.stack);
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
        console.warn(`[prepareDataForDb] Non-JSON field ${key} is an array, setting to null`);
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
          console.warn(`[prepareDataForDb] Failed to parse JSON for field ${field}:`, e);
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
    // Log incoming request data for debugging
    console.log('[POST /consultations] Incoming request keys:', Object.keys(req.body));
    console.log('[POST /consultations] PatientId:', req.body.patientId);
    
    // Parse and validate data
    let data;
    try {
      data = consultationSchema.parse(req.body);
    } catch (validationError: any) {
      console.error('[POST /consultations] Validation error:', validationError.errors);
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
    
    // Define JSON fields list for logging (same as in prepareDataForDb)
    const jsonFieldsList = [
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
    
    // Log prepared data for debugging (but limit JSON fields to avoid huge logs)
    const logData = { ...preparedData };
    jsonFieldsList.forEach((field) => {
      if (logData[field]) {
        logData[field] = Array.isArray(logData[field]) 
          ? `[Array with ${logData[field].length} items]` 
          : typeof logData[field];
      }
    });
    console.log('[POST /consultations] Prepared data (summary):', JSON.stringify(logData, null, 2));
    console.log('[POST /consultations] Full prepared data keys:', Object.keys(preparedData));
    
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
    
    console.log('[POST /consultations] Final data keys for Prisma:', Object.keys(dataForPrisma));
    console.log('[POST /consultations] PatientId:', dataForPrisma.patientId);
    console.log('[POST /consultations] DoctorId:', dataForPrisma.doctorId);
    console.log('[POST /consultations] hairLossLocalization type:', typeof dataForPrisma.hairLossLocalization, Array.isArray(dataForPrisma.hairLossLocalization) ? '(array)' : '(not array)');
    console.log('[POST /consultations] hairLossLocalization value:', JSON.stringify(dataForPrisma.hairLossLocalization));
    
    try {
      const consultation = await prisma.consultation.create({
        data: dataForPrisma,
        include: {
          patient: true,
          doctor: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json({ consultation });
    } catch (dbError: any) {
      console.error('[POST /consultations] Prisma error message:', dbError.message);
      console.error('[POST /consultations] Prisma error code:', dbError.code);
      console.error('[POST /consultations] Full error:', dbError);
      if (dbError.meta) {
        console.error('[POST /consultations] Prisma error meta:', JSON.stringify(dbError.meta, null, 2));
      }
      
      // Extract more details about which field caused the error
      let errorDetails = dbError.meta || {};
      if (dbError.message) {
        // Try to extract field name from error message
        const fieldMatch = dbError.message.match(/Argument `(\w+)`/);
        if (fieldMatch) {
          errorDetails.field = fieldMatch[1];
          errorDetails.providedValue = dataForPrisma[fieldMatch[1]];
        }
      }
      
      return res.status(500).json({
        error: 'Wewnętrzny błąd serwera',
        message: dbError.message,
        details: errorDetails,
      });
    }
  } catch (error: any) {
    // Log validation errors for debugging
    if (error.name === 'ZodError') {
      console.error('Validation error:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        error: 'Błąd walidacji danych',
        details: error.errors,
      });
    }
    console.error('[POST /consultations] Unexpected error:', error);
    next(error);
  }
});

// Update consultation
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
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

    res.json({ consultation });
  } catch (error: any) {
    // Log validation errors for debugging
    if (error.name === 'ZodError') {
      console.error('Validation error:', JSON.stringify(error.errors, null, 2));
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

    const consultation = await prisma.consultation.update({
      where: { id },
      data: { isArchived: true },
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
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    }

    if (!consultation.isArchived) {
      return res.status(400).json({ error: 'Konsultacja nie jest zarchiwizowana' });
    }

    const restoredConsultation = await prisma.consultation.update({
      where: { id },
      data: { isArchived: false },
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

    res.json({ 
      message: 'Konsultacja została trwale usunięta zgodnie z RODO',
      deleted: true
    });
  } catch (error) {
    next(error);
  }
});

export default router;


