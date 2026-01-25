import express from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pdfLimiter } from '../middleware/rateLimit';
import { prisma } from '../prisma';

const router = express.Router();

const pdfDir = process.env.PDF_DIR || path.join(__dirname, '../../storage/pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

function safeSendPdfFile(res: express.Response, filePath: string, downloadName: string) {
  const resolvedDir = path.resolve(pdfDir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    return res.status(403).json({ error: 'Brak dostępu do pliku' });
  }
  if (!fs.existsSync(resolvedFile)) {
    return res.status(404).json({ error: 'Plik nie istnieje' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.sendFile(resolvedFile);
}

// Create PDF job for consultation
router.post('/consultations/:id', authenticate, pdfLimiter, async (req: AuthRequest, res, next) => {
  try {
    const consultationId = req.params.id;
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { id: true },
    });
    if (!consultation) return res.status(404).json({ error: 'Konsultacja nie znaleziona' });

    const job = await prisma.pdfJob.create({
      data: {
        type: 'CONSULTATION',
        consultationId,
        requestedByUserId: req.user!.id,
      },
      select: { id: true, status: true, createdAt: true },
    });

    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

// Create PDF job for care plan
router.post('/care-plans/:id', authenticate, pdfLimiter, async (req: AuthRequest, res, next) => {
  try {
    const carePlanId = req.params.id;
    const carePlan = await prisma.carePlan.findUnique({
      where: { id: carePlanId },
      select: { id: true },
    });
    if (!carePlan) return res.status(404).json({ error: 'Plan opieki nie znaleziony' });

    const job = await prisma.pdfJob.create({
      data: {
        type: 'CARE_PLAN',
        carePlanId,
        requestedByUserId: req.user!.id,
      },
      select: { id: true, status: true, createdAt: true },
    });

    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

// Get job status
router.get('/jobs/:jobId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const jobId = req.params.jobId;
    const job = await prisma.pdfJob.findUnique({
      where: { id: jobId },
      select: { id: true, type: true, status: true, createdAt: true, startedAt: true, finishedAt: true, requestedByUserId: true },
    });
    if (!job) return res.status(404).json({ error: 'Job nie znaleziony' });
    if (job.requestedByUserId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }
    const { requestedByUserId, ...safeJob } = job;
    res.json({ job: safeJob });
  } catch (error) {
    next(error);
  }
});

// Download finished PDF
router.get('/jobs/:jobId/download', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const jobId = req.params.jobId;
    const job = await prisma.pdfJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, filePath: true, type: true, consultationId: true, carePlanId: true, requestedByUserId: true },
    });
    if (!job) return res.status(404).json({ error: 'Job nie znaleziony' });
    if (job.requestedByUserId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }
    if (job.status !== 'DONE' || !job.filePath) return res.status(409).json({ error: 'PDF nie jest gotowy' });

    const filename = job.type === 'CONSULTATION'
      ? `konsultacja-${job.consultationId || job.id}.pdf`
      : `plan-opieki-${job.carePlanId || job.id}.pdf`;

    return safeSendPdfFile(res, job.filePath, filename);
  } catch (error) {
    next(error);
  }
});

export default router;


