"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPdfWorker = startPdfWorker;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../prisma");
const logger_1 = require("../utils/logger");
const pdfService_1 = require("../services/pdfService");
const pdfDir = process.env.PDF_DIR || path_1.default.join(__dirname, '../../storage/pdfs');
if (!fs_1.default.existsSync(pdfDir)) {
    fs_1.default.mkdirSync(pdfDir, { recursive: true });
}
async function claimNextJob() {
    const candidate = await prisma_1.prisma.pdfJob.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
    });
    if (!candidate)
        return null;
    const updated = await prisma_1.prisma.pdfJob.updateMany({
        where: { id: candidate.id, status: 'QUEUED' },
        data: { status: 'PROCESSING', startedAt: new Date() },
    });
    if (updated.count === 0)
        return null;
    return prisma_1.prisma.pdfJob.findUnique({
        where: { id: candidate.id },
        select: { id: true, type: true, consultationId: true, carePlanId: true },
    });
}
async function processJob(job) {
    try {
        let pdfBuffer;
        if (job.type === 'CONSULTATION') {
            if (!job.consultationId)
                throw new Error('Brak consultationId');
            const consultation = await prisma_1.prisma.consultation.findUnique({
                where: { id: job.consultationId },
                include: {
                    patient: true,
                    doctor: { select: { id: true, name: true, email: true } },
                },
            });
            if (!consultation)
                throw new Error('Konsultacja nie znaleziona');
            pdfBuffer = await (0, pdfService_1.generateConsultationPDF)(consultation);
        }
        else {
            if (!job.carePlanId)
                throw new Error('Brak carePlanId');
            const carePlan = await prisma_1.prisma.carePlan.findUnique({
                where: { id: job.carePlanId },
                include: {
                    patient: true,
                    createdBy: { select: { id: true, name: true, email: true } },
                    weeks: { orderBy: { weekNumber: 'asc' } },
                },
            });
            if (!carePlan)
                throw new Error('Plan opieki nie znaleziony');
            pdfBuffer = await (0, pdfService_1.generateCarePlanPDF)(carePlan);
        }
        const outPath = path_1.default.join(pdfDir, `pdf-${job.id}.pdf`);
        fs_1.default.writeFileSync(outPath, pdfBuffer);
        await prisma_1.prisma.pdfJob.update({
            where: { id: job.id },
            data: { status: 'DONE', filePath: outPath, finishedAt: new Date(), errorMessage: null },
        });
    }
    catch (e) {
        logger_1.logger.error('PDF job failed', { jobId: job.id, errorName: e?.name, errorMessage: e?.message });
        await prisma_1.prisma.pdfJob.update({
            where: { id: job.id },
            data: { status: 'FAILED', finishedAt: new Date(), errorMessage: 'PDF generation failed' },
        });
    }
}
let running = false;
async function tick() {
    if (running)
        return;
    running = true;
    try {
        const job = await claimNextJob();
        if (job)
            await processJob(job);
    }
    finally {
        running = false;
    }
}
async function startPdfWorker() {
    logger_1.logger.info('PDF worker started');
    await tick();
    setInterval(tick, 1000);
}
startPdfWorker().catch((e) => {
    logger_1.logger.error('PDF worker crashed', { errorName: e?.name, errorMessage: e?.message });
    process.exit(1);
});
//# sourceMappingURL=pdfWorker.js.map