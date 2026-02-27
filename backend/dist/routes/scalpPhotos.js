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
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || path_1.default.join(process.cwd(), 'storage/uploads');
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Ensure the directory is fully resolved
const normalizedUploadDir = path_1.default.resolve(UPLOAD_DIR);
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, normalizedUploadDir),
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `scalp-${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Niedozwolony format pliku. Tylko JPG, PNG, WEBP.'));
        }
    },
});
const annotationSchema = zod_1.z.object({
    type: zod_1.z.enum(['PROBLEM_AREA', 'NOTE', 'OTHER']),
    shapeType: zod_1.z.enum(['RECT', 'CIRCLE', 'POLYGON']),
    coordinates: zod_1.z.any(),
    label: zod_1.z.string().min(1, 'Etykieta jest wymagana'),
});
// Secure image download endpoint
router.get('/secure/:filename', async (req, res) => {
    const { filename } = req.params;
    const token = req.query.token;
    if (!token)
        return res.status(401).json({ error: 'Brak tokenu autoryzacyjnego' });
    try {
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const normalizedFilePath = path_1.default.resolve(path_1.default.join(normalizedUploadDir, filename));
        if (!normalizedFilePath.startsWith(normalizedUploadDir)) {
            return res.status(403).json({ error: 'Odmowa dostępu: niedozwolona ścieżka' });
        }
        if (!fs_1.default.existsSync(normalizedFilePath)) {
            return res.status(404).json({ error: 'Plik nie istnieje' });
        }
        res.setHeader('Cache-Control', 'private, max-age=86400');
        // Security header to avoid XSS issues
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.sendFile(normalizedFilePath);
    }
    catch (err) {
        return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
});
// Upload scalp photo
router.post('/patient/:patientId', auth_1.authenticate, upload.single('photo'), async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { consultationId, notes } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'Brak pliku lub zły format' });
        }
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: patientId },
        });
        if (!patient) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        try {
            const scalpPhoto = await prisma_1.prisma.scalpPhoto.create({
                data: {
                    patientId,
                    consultationId: consultationId || undefined,
                    uploadedByUserId: req.user.id,
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
        }
        catch (dbError) {
            if (fs_1.default.existsSync(req.file.path))
                fs_1.default.unlinkSync(req.file.path);
            throw dbError;
        }
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
                uploadedBy: { select: { id: true, name: true } },
                annotations: { orderBy: { createdAt: 'asc' } },
            },
        });
        res.json({ scalpPhotos });
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
        if (!scalpPhoto.filePath || !fs_1.default.existsSync(scalpPhoto.filePath)) {
            return res.status(404).json({ error: 'Plik nie istnieje na serwerze' });
        }
        // All authenticated users can access patient photos in this system
        // (If role-based access is needed, add check here: e.g., requireRole('DOCTOR', 'ADMIN'))
        // Set appropriate headers
        res.setHeader('Content-Type', scalpPhoto.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${scalpPhoto.originalFilename}"`);
        res.setHeader('Cache-Control', 'private, max-age=86400'); // private: patient data must not be cached by shared proxies
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
            url: scalpPhoto.filename ? `/api/uploads/secure/${scalpPhoto.filename}` : (scalpPhoto.filePath ? `/uploads/${path_1.default.basename(scalpPhoto.filePath)}` : null),
        };
        res.json({ scalpPhoto: photoWithUrl });
    }
    catch (error) {
        next(error);
    }
});
// Update scalp photo (notes) - DOCTOR/ADMIN only
router.put('/:id', auth_1.authenticate, (0, auth_1.requireWriteAccess)(), async (req, res, next) => {
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
            url: scalpPhoto.filename ? `/api/uploads/secure/${scalpPhoto.filename}` : (scalpPhoto.filePath ? `/uploads/${path_1.default.basename(scalpPhoto.filePath)}` : null),
        };
        res.json({ scalpPhoto: photoWithUrl });
    }
    catch (error) {
        next(error);
    }
});
// Delete scalp photo - DOCTOR/ADMIN only
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireWriteAccess)(), async (req, res, next) => {
    try {
        const { id } = req.params;
        const scalpPhoto = await prisma_1.prisma.scalpPhoto.findUnique({
            where: { id },
        });
        if (!scalpPhoto) {
            return res.status(404).json({ error: 'Zdjęcie nie znalezione' });
        }
        // Delete file from filesystem - try by filename (new approach) then filePath (legacy)
        if (scalpPhoto.filename) {
            const filePathByName = path_1.default.join(normalizedUploadDir, scalpPhoto.filename);
            if (fs_1.default.existsSync(filePathByName)) {
                fs_1.default.unlinkSync(filePathByName);
            }
        }
        else if (scalpPhoto.filePath && fs_1.default.existsSync(scalpPhoto.filePath)) {
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