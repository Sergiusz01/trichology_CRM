"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../prisma");
const logger_1 = require("../utils/logger");
const RETENTION_DAYS = parseInt(process.env.ANONYMIZE_AFTER_DAYS || '365', 10);
const DELETE_FILES = (process.env.ANONYMIZE_DELETE_FILES || 'true') === 'true';
async function main() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    logger_1.logger.info('Anonymization start', { retentionDays: RETENTION_DAYS });
    const patients = await prisma_1.prisma.patient.findMany({
        where: { isArchived: true, updatedAt: { lt: cutoff } },
        select: { id: true },
    });
    for (const p of patients) {
        // eslint-disable-next-line no-await-in-loop
        const photos = await prisma_1.prisma.scalpPhoto.findMany({
            where: { patientId: p.id },
            select: { id: true, filePath: true },
        });
        if (DELETE_FILES) {
            for (const photo of photos) {
                const fp = path_1.default.resolve(photo.filePath);
                if (fs_1.default.existsSync(fp)) {
                    try {
                        fs_1.default.unlinkSync(fp);
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }
        // eslint-disable-next-line no-await-in-loop
        await prisma_1.prisma.scalpPhoto.deleteMany({ where: { patientId: p.id } });
        // eslint-disable-next-line no-await-in-loop
        await prisma_1.prisma.patient.update({
            where: { id: p.id },
            data: {
                firstName: '[ANON]',
                lastName: '[ANON]',
                phone: null,
                email: null,
                address: null,
                occupation: null,
            },
        });
    }
    logger_1.logger.info('Anonymization done', { anonymizedCount: patients.length });
}
main().catch((e) => {
    logger_1.logger.error('Anonymization failed', { errorName: e?.name, errorMessage: e?.message });
    process.exit(1);
});
//# sourceMappingURL=anonymizeArchivedPatients.js.map