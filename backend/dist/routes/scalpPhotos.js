"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './storage/uploads';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `scalp-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        }
        else {
            cb(new Error('Tylko pliki obrazów (JPEG, PNG, WEBP) są dozwolone'));
        }
    },
});
const annotationSchema = zod_1.z.object({
    type: zod_1.z.enum(['PROBLEM_AREA', 'NOTE', 'OTHER']),
    shapeType: zod_1.z.enum(['RECT', 'CIRCLE', 'POLYGON']),
    coordinates: zod_1.z.any(), // JSON object
    label: zod_1.z.string().min(1, 'Etykieta jest wymagana'),
});
// Upload scalp photo
router.post('/patient/:patientId', auth_1.authenticate, upload.single('photo'), async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { consultationId, notes } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'Brak pliku' });
        }
        // Verify patient exists
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: patientId },
        });
        if (!patient) {
            // Delete uploaded file if patient doesn't exist
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        const scalpPhoto = await prisma_1.prisma.scalpPhoto.create({
            data: {
                patientId,
                consultationId: consultationId || undefined,
                uploadedByUserId: req.user.id,
                filePath: req.file.path,
                originalFilename: req.file.originalname,
                mimeType: req.file.mimetype,
                notes: notes || undefined,
            },
            include: {
                patient: {
                    select: { id: true, firstName: true, lastName: true },
                },
                uploadedBy: {
                    select: { id: true, name: true },
                },
            },
        });
        // Add URL field for frontend (use secured route)
        const photoWithUrl = {
            ...scalpPhoto,
            url: `/uploads/${path_1.default.basename(scalpPhoto.filePath)}`,
        };
        res.status(201).json({ scalpPhoto: photoWithUrl });
    }
    catch (error) {
        next(error);
    }
});
// Get scalp photos for a patient
router.get('/patient/:patientId', auth_1.authenticate, async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { consultationId } = req.query;
        const where = { patientId };
        if (consultationId) {
            where.consultationId = consultationId;
        }
        const scalpPhotos = await prisma_1.prisma.scalpPhoto.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                uploadedBy: {
                    select: { id: true, name: true },
                },
                annotations: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        // Convert file paths to URLs (use secured route)
        const photosWithUrls = scalpPhotos.map(photo => ({
            ...photo,
            url: `/uploads/${path_1.default.basename(photo.filePath)}`,
        }));
        res.json({ scalpPhotos: photosWithUrls });
    }
    catch (error) {
        next(error);
    }
});
// Get scalp photo file (secured route)
router.get('/:id/file', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        // Get scalp photo and verify it exists
        const scalpPhoto = await prisma_1.prisma.scalpPhoto.findUnique({
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
        if (!fs_1.default.existsSync(scalpPhoto.filePath)) {
            return res.status(404).json({ error: 'Plik nie istnieje na serwerze' });
        }
        // All authenticated users can access patient photos in this system
        // (If role-based access is needed, add check here: e.g., requireRole('DOCTOR', 'ADMIN'))
        // Set appropriate headers
        res.setHeader('Content-Type', scalpPhoto.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${scalpPhoto.originalFilename}"`);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        // Send file
        res.sendFile(path_1.default.resolve(scalpPhoto.filePath));
    }
    catch (error) {
        next(error);
    }
});
// Get scalp photo by ID
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const scalpPhoto = await prisma_1.prisma.scalpPhoto.findUnique({
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
            url: `/uploads/${path_1.default.basename(scalpPhoto.filePath)}`,
        };
        res.json({ scalpPhoto: photoWithUrl });
    }
    catch (error) {
        next(error);
    }
});
// Update scalp photo (notes)
router.put('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const scalpPhoto = await prisma_1.prisma.scalpPhoto.update({
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
            url: `/uploads/${path_1.default.basename(scalpPhoto.filePath)}`,
        };
        res.json({ scalpPhoto: photoWithUrl });
    }
    catch (error) {
        next(error);
    }
});
// Delete scalp photo
router.delete('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const scalpPhoto = await prisma_1.prisma.scalpPhoto.findUnique({
            where: { id },
        });
        if (!scalpPhoto) {
            return res.status(404).json({ error: 'Zdjęcie nie znalezione' });
        }
        // Delete file from filesystem
        if (fs_1.default.existsSync(scalpPhoto.filePath)) {
            fs_1.default.unlinkSync(scalpPhoto.filePath);
        }
        // Delete from database (cascade will delete annotations)
        await prisma_1.prisma.scalpPhoto.delete({
            where: { id },
        });
        res.json({ message: 'Zdjęcie usunięte' });
    }
    catch (error) {
        next(error);
    }
});
// Create annotation
router.post('/:id/annotations', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = annotationSchema.parse(req.body);
        // Verify photo exists
        const photo = await prisma_1.prisma.scalpPhoto.findUnique({
            where: { id },
        });
        if (!photo) {
            return res.status(404).json({ error: 'Zdjęcie nie znalezione' });
        }
        const annotation = await prisma_1.prisma.scalpPhotoAnnotation.create({
            data: {
                scalpPhotoId: id,
                type: data.type,
                shapeType: data.shapeType,
                label: data.label,
                coordinates: data.coordinates || {},
            },
        });
        res.status(201).json({ annotation });
    }
    catch (error) {
        next(error);
    }
});
// Get annotations for a photo
router.get('/:id/annotations', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const annotations = await prisma_1.prisma.scalpPhotoAnnotation.findMany({
            where: { scalpPhotoId: id },
            orderBy: { createdAt: 'asc' },
        });
        res.json({ annotations });
    }
    catch (error) {
        next(error);
    }
});
// Update annotation
router.put('/annotations/:annotationId', auth_1.authenticate, async (req, res, next) => {
    try {
        const { annotationId } = req.params;
        const data = annotationSchema.partial().parse(req.body);
        const annotation = await prisma_1.prisma.scalpPhotoAnnotation.update({
            where: { id: annotationId },
            data,
        });
        res.json({ annotation });
    }
    catch (error) {
        next(error);
    }
});
// Delete annotation
router.delete('/annotations/:annotationId', auth_1.authenticate, async (req, res, next) => {
    try {
        const { annotationId } = req.params;
        await prisma_1.prisma.scalpPhotoAnnotation.delete({
            where: { id: annotationId },
        });
        res.json({ message: 'Adnotacja usunięta' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=scalpPhotos.js.map