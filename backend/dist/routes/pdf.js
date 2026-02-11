"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
const pdfDir = process.env.PDF_DIR || path_1.default.join(__dirname, '../../storage/pdfs');
if (!fs_1.default.existsSync(pdfDir)) {
    fs_1.default.mkdirSync(pdfDir, { recursive: true });
}
function safeSendPdfFile(res, filePath, downloadName) {
    const resolvedDir = path_1.default.resolve(pdfDir);
    const resolvedFile = path_1.default.resolve(filePath);
    if (!resolvedFile.startsWith(resolvedDir + path_1.default.sep)) {
        return res.status(403).json({ error: 'Brak dostępu do pliku' });
    }
    if (!fs_1.default.existsSync(resolvedFile)) {
        return res.status(404).json({ error: 'Plik nie istnieje' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(resolvedFile);
}
// Create PDF job for consultation
router.post('/consultations/:id', auth_1.authenticate, rateLimit_1.pdfLimiter, async (req, res, next) => {
    try {
        const consultationId = req.params.id;
        const consultation = await prisma_1.prisma.consultation.findUnique({
            where: { id: consultationId },
            select: { id: true },
        });
        if (!consultation)
            return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
        const job = await prisma_1.prisma.pdfJob.create({
            data: {
                type: 'CONSULTATION',
                consultationId,
                requestedByUserId: req.user.id,
            },
            select: { id: true, status: true, createdAt: true },
        });
        res.status(202).json({ job });
    }
    catch (error) {
        next(error);
    }
});
// Create PDF job for care plan
router.post('/care-plans/:id', auth_1.authenticate, rateLimit_1.pdfLimiter, async (req, res, next) => {
    try {
        const carePlanId = req.params.id;
        const carePlan = await prisma_1.prisma.carePlan.findUnique({
            where: { id: carePlanId },
            select: { id: true },
        });
        if (!carePlan)
            return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
        const job = await prisma_1.prisma.pdfJob.create({
            data: {
                type: 'CARE_PLAN',
                carePlanId,
                requestedByUserId: req.user.id,
            },
            select: { id: true, status: true, createdAt: true },
        });
        res.status(202).json({ job });
    }
    catch (error) {
        next(error);
    }
});
// Get job status
router.get('/jobs/:jobId', auth_1.authenticate, async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        const job = await prisma_1.prisma.pdfJob.findUnique({
            where: { id: jobId },
            select: { id: true, type: true, status: true, createdAt: true, startedAt: true, finishedAt: true, requestedByUserId: true },
        });
        if (!job)
            return res.status(404).json({ error: 'Job nie znaleziony' });
        if (job.requestedByUserId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Brak uprawnień' });
        }
        const { requestedByUserId, ...safeJob } = job;
        res.json({ job: safeJob });
    }
    catch (error) {
        next(error);
    }
});
// Download finished PDF
router.get('/jobs/:jobId/download', auth_1.authenticate, async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        const job = await prisma_1.prisma.pdfJob.findUnique({
            where: { id: jobId },
            select: { id: true, status: true, filePath: true, type: true, consultationId: true, carePlanId: true, requestedByUserId: true },
        });
        if (!job)
            return res.status(404).json({ error: 'Job nie znaleziony' });
        if (job.requestedByUserId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Brak uprawnień' });
        }
        if (job.status !== 'DONE' || !job.filePath)
            return res.status(409).json({ error: 'PDF nie jest gotowy' });
        const filename = job.type === 'CONSULTATION'
            ? `konsultacja-${job.consultationId || job.id}.pdf`
            : `plan-opieki-${job.carePlanId || job.id}.pdf`;
        return safeSendPdfFile(res, job.filePath, filename);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=pdf.js.map