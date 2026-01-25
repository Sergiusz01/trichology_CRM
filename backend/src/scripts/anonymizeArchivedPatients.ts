import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';

const RETENTION_DAYS = parseInt(process.env.ANONYMIZE_AFTER_DAYS || '365', 10);
const DELETE_FILES = (process.env.ANONYMIZE_DELETE_FILES || 'true') === 'true';

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  logger.info('Anonymization start', { retentionDays: RETENTION_DAYS });

  const patients = await prisma.patient.findMany({
    where: { isArchived: true, updatedAt: { lt: cutoff } },
    select: { id: true },
  });

  for (const p of patients) {
    // eslint-disable-next-line no-await-in-loop
    const photos = await prisma.scalpPhoto.findMany({
      where: { patientId: p.id },
      select: { id: true, filePath: true },
    });

    if (DELETE_FILES) {
      for (const photo of photos) {
        const fp = path.resolve(photo.filePath);
        if (fs.existsSync(fp)) {
          try {
            fs.unlinkSync(fp);
          } catch {
            // ignore
          }
        }
      }
    }

    // eslint-disable-next-line no-await-in-loop
    await prisma.scalpPhoto.deleteMany({ where: { patientId: p.id } });

    // eslint-disable-next-line no-await-in-loop
    await prisma.patient.update({
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

  logger.info('Anonymization done', { anonymizedCount: patients.length });
}

main().catch((e) => {
  logger.error('Anonymization failed', { errorName: e?.name, errorMessage: e?.message });
  process.exit(1);
});



