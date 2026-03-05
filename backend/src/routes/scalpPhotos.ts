import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { authenticate, requireWriteAccess, AuthRequest } from '../middleware/auth';
import { canAccessPatient } from '../middleware/authorizePatientAccess';
import { prisma } from '../prisma';

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'storage/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Ensure the directory is fully resolved
const normalizedUploadDir = path.resolve(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, normalizedUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `scalp-${uuidv4()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — [C-5] hard limit before magic bytes check
  fileFilter: (req, file, cb) => {
    // [C-5] Layer 1: MIME type from Content-Type header (quick, not tamper-proof)
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Niedozwolony format pliku. Tylko JPG, PNG, WEBP.'));
    }
  },
});

const annotationSchema = z.object({
  type: z.enum(['PROBLEM_AREA', 'NOTE', 'OTHER']),
  shapeType: z.enum(['RECT', 'CIRCLE', 'POLYGON']),
  coordinates: z.any(),
  label: z.string().min(1, 'Etykieta jest wymagana'),
});

// Secure image download endpoint
// Accepts JWT from Authorization header (preferred) or query string (legacy/deprecated)
router.get('/secure/:filename', async (req, res) => {
  const { filename } = req.params;

  // Prefer Authorization header, fall back to query string
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.query.token as string | undefined;
  }

  if (!token) return res.status(401).json({ error: 'Brak tokenu autoryzacyjnego' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; role: string };

    // [C-3] Path traversal prevention: validate filename BEFORE constructing any path
    const safeName = path.basename(filename);
    if (!safeName || safeName !== filename || safeName.startsWith('.')) {
      console.warn(`[SECURITY] Path traversal attempt: filename="${filename}" ip=${req.ip} userId=${decoded.userId}`);
      return res.status(400).json({ error: 'Nieprawidłowa nazwa pliku' });
    }
    const normalizedFilePath = path.resolve(path.join(normalizedUploadDir, safeName));
    // defence-in-depth: confirm resolved path is still inside the upload dir
    if (!normalizedFilePath.startsWith(normalizedUploadDir + path.sep)) {
      console.warn(`[SECURITY] Path traversal attempt: filename="${filename}" resolved="${normalizedFilePath}" ip=${req.ip}`);
      return res.status(403).json({ error: 'Odmowa dostępu: niedozwolona ścieżka' });
    }

    // [C-2] Every file must have a DB record tied to a patient the user may access
    const photo = await prisma.scalpPhoto.findFirst({
      where: {
        OR: [{ filename: safeName }, { filePath: { endsWith: safeName } }],
      },
      include: {
        patient: { select: { id: true, clinicId: true, assignedDoctorId: true } },
      },
    });
    if (!photo) {
      console.warn(`[SECURITY] File without DB record requested: filename="${safeName}" ip=${req.ip}`);
      return res.status(404).json({ error: 'Plik nie znaleziony' });
    }

    // Fetch full user info for access check (clinicId not in JWT payload)
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, clinicId: true },
    });
    if (!dbUser) return res.status(401).json({ error: 'Użytkownik nie istnieje' });

    if (!canAccessPatient(dbUser, photo.patient)) {
      console.warn(
        `[SECURITY] Unauthorized file download: userId=${dbUser.id} role=${dbUser.role} ` +
          `filename="${safeName}" patientId=${photo.patient.id} ip=${req.ip}`,
      );
      return res.status(403).json({ error: 'Brak dostępu do tego pliku' });
    }

    if (!fs.existsSync(normalizedFilePath)) {
      return res.status(404).json({ error: 'Plik nie istnieje' });
    }

    res.setHeader('Cache-Control', 'private, max-age=86400');
    // Security header to avoid XSS issues
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.sendFile(normalizedFilePath);
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
    throw err;
  }
});

// Upload scalp photo
router.post('/patient/:patientId', authenticate, upload.single('photo'), async (req: AuthRequest, res, next) => {
  try {
    const { patientId } = req.params;
    const { consultationId, notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku lub zły format' });
    }

    // [C-5] Layer 2: magic bytes check — validates actual file content, not HTTP header
    try {
      const { fileTypeFromFile } = await import('file-type');
      const detected = await fileTypeFromFile(req.file.path);
      if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Nieprawidłowy typ pliku. Dozwolone: JPEG, PNG, WebP.' });
      }
    } catch (typeError) {
      console.error('[C-5] fileTypeFromFile error:', typeError);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Nieprawidłowy typ pliku. Dozwolone: JPEG, PNG, WebP.' });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });

    if (!patient) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    }

    // [C-1] / [C-2] access check before creating photo record
    if (!canAccessPatient(req.user!, patient)) {
      fs.unlinkSync(req.file.path);
      console.warn(`[SECURITY] Unauthorized photo upload: userId=${req.user!.id} patientId=${patientId} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tego pacjenta' });
    }

    try {
      const scalpPhoto = await prisma.scalpPhoto.create({
        data: {
          patientId,
          consultationId: consultationId || undefined,
          uploadedByUserId: req.user!.id,
          filename: req.file.filename,
          filePath: req.file.path, // deprecated legacy fallback
          originalFilename: req.file.originalname,
          mimeType: req.file.mimetype,
          notes: notes || undefined,
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ scalpPhoto });
    } catch (dbError) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
});

// Get scalp photos for a patient
router.get('/patient/:patientId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { patientId } = req.params;
    const { consultationId } = req.query;

    // [C-1] access check
    const patientCheck = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });
    if (!patientCheck) return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    if (!canAccessPatient(req.user!, patientCheck)) {
      console.warn(`[SECURITY] Unauthorized photos list: userId=${req.user!.id} patientId=${patientId} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tego pacjenta' });
    }

    const where: any = { patientId };
    if (consultationId) {
      where.consultationId = consultationId;
    }

    const scalpPhotos = await prisma.scalpPhoto.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        annotations: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.json({ scalpPhotos });
  } catch (error) {
    next(error);
  }
});

// Get scalp photo file (secured route)
router.get('/:id/file', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Get scalp photo and verify it exists
    const scalpPhoto = await prisma.scalpPhoto.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!scalpPhoto) {
      return res.status(404).json({ error: 'Zdjęcie nie znalezione' });
    }

    // Verify file exists on disk
    if (!scalpPhoto.filePath || !fs.existsSync(scalpPhoto.filePath)) {
      return res.status(404).json({ error: 'Plik nie istnieje na serwerze' });
    }

    // All authenticated users can access patient photos in this system
    // (If role-based access is needed, add check here: e.g., requireRole('DOCTOR', 'ADMIN'))

    // Set appropriate headers
    res.setHeader('Content-Type', scalpPhoto.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${scalpPhoto.originalFilename}"`);
    res.setHeader('Cache-Control', 'private, max-age=86400'); // private: patient data must not be cached by shared proxies

    // Send file
    res.sendFile(path.resolve(scalpPhoto.filePath));
  } catch (error) {
    next(error);
  }
});

// Get scalp photo by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const scalpPhoto = await prisma.scalpPhoto.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
        annotations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!scalpPhoto) {
      return res.status(404).json({ error: 'Zdjęcie nie znalezione' });
    }

    // Use secured file route instead of /uploads
    const photoWithUrl = {
      ...scalpPhoto,
      url: scalpPhoto.filename ? `/api/uploads/secure/${scalpPhoto.filename}` : (scalpPhoto.filePath ? `/uploads/${path.basename(scalpPhoto.filePath)}` : null),
    };

    res.json({ scalpPhoto: photoWithUrl });
  } catch (error) {
    next(error);
  }
});

// Update scalp photo (notes) - DOCTOR/ADMIN only
router.put('/:id', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const scalpPhoto = await prisma.scalpPhoto.update({
      where: { id },
      data: {
        notes: notes || undefined,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
        annotations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const photoWithUrl = {
      ...scalpPhoto,
      url: scalpPhoto.filename ? `/api/uploads/secure/${scalpPhoto.filename}` : (scalpPhoto.filePath ? `/uploads/${path.basename(scalpPhoto.filePath)}` : null),
    };

    res.json({ scalpPhoto: photoWithUrl });
  } catch (error) {
    next(error);
  }
});

// Delete scalp photo - DOCTOR/ADMIN only
router.delete('/:id', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const scalpPhoto = await prisma.scalpPhoto.findUnique({
      where: { id },
    });

    if (!scalpPhoto) {
      return res.status(404).json({ error: 'Zdjęcie nie znalezione' });
    }

    // Delete file from filesystem - try by filename (new approach) then filePath (legacy)
    if (scalpPhoto.filename) {
      const filePathByName = path.join(normalizedUploadDir, scalpPhoto.filename);
      if (fs.existsSync(filePathByName)) {
        fs.unlinkSync(filePathByName);
      }
    } else if (scalpPhoto.filePath && fs.existsSync(scalpPhoto.filePath)) {
      fs.unlinkSync(scalpPhoto.filePath);
    }

    // Delete from database (cascade will delete annotations)
    await prisma.scalpPhoto.delete({
      where: { id },
    });

    res.json({ message: 'Zdjęcie usunięte' });
  } catch (error) {
    next(error);
  }
});

// Create annotation
router.post('/:id/annotations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = annotationSchema.parse(req.body);

    // Verify photo exists
    const photo = await prisma.scalpPhoto.findUnique({
      where: { id },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Zdjęcie nie znalezione' });
    }

    const annotation = await prisma.scalpPhotoAnnotation.create({
      data: {
        scalpPhotoId: id,
        type: data.type,
        shapeType: data.shapeType,
        label: data.label,
        coordinates: data.coordinates || {},
      },
    });

    res.status(201).json({ annotation });
  } catch (error) {
    next(error);
  }
});

// Get annotations for a photo
router.get('/:id/annotations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const annotations = await prisma.scalpPhotoAnnotation.findMany({
      where: { scalpPhotoId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ annotations });
  } catch (error) {
    next(error);
  }
});

// Update annotation
router.put('/annotations/:annotationId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { annotationId } = req.params;
    const data = annotationSchema.partial().parse(req.body);

    const annotation = await prisma.scalpPhotoAnnotation.update({
      where: { id: annotationId },
      data,
    });

    res.json({ annotation });
  } catch (error) {
    next(error);
  }
});

// Delete annotation
router.delete('/annotations/:annotationId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { annotationId } = req.params;

    await prisma.scalpPhotoAnnotation.delete({
      where: { id: annotationId },
    });

    res.json({ message: 'Adnotacja usunięta' });
  } catch (error) {
    next(error);
  }
});

export default router;

