import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { generateCarePlanPDF, generateConsultationPDF } from '../services/pdfService';

const pdfDir = process.env.PDF_DIR || path.join(__dirname, '../../storage/pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

async function claimNextJob() {
  const candidate = await prisma.pdfJob.findFirst({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!candidate) return null;

  const updated = await prisma.pdfJob.updateMany({
    where: { id: candidate.id, status: 'QUEUED' },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  if (updated.count === 0) return null;

  return prisma.pdfJob.findUnique({
    where: { id: candidate.id },
    select: { id: true, type: true, consultationId: true, carePlanId: true },
  });
}

async function processJob(job: { id: string; type: 'CONSULTATION' | 'CARE_PLAN'; consultationId: string | null; carePlanId: string | null }) {
  try {
    let pdfBuffer: Buffer;

    if (job.type === 'CONSULTATION') {
      if (!job.consultationId) throw new Error('Brak consultationId');
      const consultation = await prisma.consultation.findUnique({
        where: { id: job.consultationId },
        include: {
          patient: true,
          doctor: { select: { id: true, name: true, email: true } },
        },
      });
      if (!consultation) throw new Error('Konsultacja nie znaleziona');
      pdfBuffer = await generateConsultationPDF(consultation);
    } else {
      if (!job.carePlanId) throw new Error('Brak carePlanId');
      const carePlan = await prisma.carePlan.findUnique({
        where: { id: job.carePlanId },
        include: {
          patient: true,
          createdBy: { select: { id: true, name: true, email: true } },
          weeks: { orderBy: { weekNumber: 'asc' } },
        },
      });
      if (!carePlan) throw new Error('Plan opieki nie znaleziony');
      pdfBuffer = await generateCarePlanPDF(carePlan);
    }

    const outPath = path.join(pdfDir, `pdf-${job.id}.pdf`);
    fs.writeFileSync(outPath, pdfBuffer);

    await prisma.pdfJob.update({
      where: { id: job.id },
      data: { status: 'DONE', filePath: outPath, finishedAt: new Date(), errorMessage: null },
    });
  } catch (e: any) {
    logger.error('PDF job failed', { jobId: job.id, errorName: e?.name, errorMessage: e?.message });
    await prisma.pdfJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', finishedAt: new Date(), errorMessage: 'PDF generation failed' },
    });
  }
}

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const job = await claimNextJob();
    if (job) await processJob(job as any);
  } finally {
    running = false;
  }
}

export async function startPdfWorker() {
  logger.info('PDF worker started');
  await tick();
  setInterval(tick, 1000);
}

startPdfWorker().catch((e) => {
  logger.error('PDF worker crashed', { errorName: e?.name, errorMessage: e?.message });
  process.exit(1);
});



