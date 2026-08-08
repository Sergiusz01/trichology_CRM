#!/usr/bin/env node
/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Trichology CRM – Eksport danych pacjentów do ZIP (offline, bez API)
 * Uruchamiany codziennie przez cron jako część backupu
 * 
 * Użycie: npx ts-node src/scripts/exportPatientsZip.ts /root/backups/
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { prisma } from '../prisma';
import {
  generateConsultationPDF,
  generateCarePlanPDF,
  generateLabResultPDF,
  generatePatientInfoPDF,
} from '../services/pdfService';

const isSafeFileName = (name: string): boolean => /^[a-zA-Z0-9._-]+$/.test(name);

async function main() {
  const outputDir = process.argv[2] || '/root/backups';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const zipFileName = `eksport-pacjentow-${timestamp}.zip`;
  const zipPath = path.join(outputDir, zipFileName);

  console.log(`[${new Date().toISOString()}] Rozpoczynam eksport pacjentów do ZIP...`);

  // Ensure output dir exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create write stream
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    process.exit(1);
  });

  archive.pipe(output);

  // Get all patients (not archived)
  const patients = await prisma.patient.findMany({
    where: { isArchived: false },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      consultations: {
        include: {
          doctor: { select: { id: true, name: true, email: true } },
          patient: { select: { id: true, firstName: true, lastName: true, age: true, gender: true, phone: true, email: true } },
        },
        orderBy: { consultationDate: 'desc' },
      },
      labResults: { orderBy: { date: 'desc' } },
      scalpPhotos: {
        include: { annotations: true },
        orderBy: { createdAt: 'desc' },
      },
      carePlans: {
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          patient: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          weeks: { orderBy: { weekNumber: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  console.log(`  Znaleziono ${patients.length} pacjentów`);

  let totalConsultations = 0;
  let totalLabResults = 0;
  let totalCarePlans = 0;
  let totalPhotos = 0;

  for (const patient of patients) {
    const patientFolderName = `${patient.lastName}_${patient.firstName}_${patient.id.slice(0, 8)}`
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/\s+/g, '_');
    const basePath = `Pacjenci/${patientFolderName}`;

    // 1. Patient info PDF
    try {
      const pdf = await generatePatientInfoPDF(patient);
      archive.append(pdf, { name: `${basePath}/00_Informacje_Pacjenta.pdf` });
    } catch (err) {
      console.warn(`  WARN: Nie udało się wygenerować PDF info dla ${patient.firstName} ${patient.lastName}: ${err}`);
      archive.append(JSON.stringify({
        id: patient.id, firstName: patient.firstName, lastName: patient.lastName,
        age: patient.age, gender: patient.gender, phone: patient.phone, email: patient.email,
        occupation: patient.occupation, address: patient.address,
        createdAt: patient.createdAt, updatedAt: patient.updatedAt,
      }, null, 2), { name: `${basePath}/00_Informacje_Pacjenta.json` });
    }

    // 2. Consultations
    if (patient.consultations.length > 0) {
      for (const consultation of patient.consultations) {
        try {
          const pdf = await generateConsultationPDF(consultation);
          const date = new Date(consultation.consultationDate).toISOString().split('T')[0].replace(/-/g, '');
          archive.append(pdf, { name: `${basePath}/01_Konsultacje/Konsultacja_${date}_${consultation.id.slice(0, 8)}.pdf` });
          totalConsultations++;
        } catch (err) {
          console.warn(`  WARN: PDF konsultacji ${consultation.id}: ${err}`);
        }
      }
    }

    // 3. Lab Results
    if (patient.labResults.length > 0) {
      for (const result of patient.labResults) {
        try {
          const pdf = await generateLabResultPDF(result, patient);
          const date = new Date(result.date).toISOString().split('T')[0].replace(/-/g, '');
          archive.append(pdf, { name: `${basePath}/02_Wyniki_Badan/Wynik_${date}_${result.id.slice(0, 8)}.pdf` });
          totalLabResults++;
        } catch (err) {
          console.warn(`  WARN: PDF wyniku ${result.id}: ${err}`);
          const date = new Date(result.date).toISOString().split('T')[0].replace(/-/g, '');
          archive.append(JSON.stringify(result, null, 2), {
            name: `${basePath}/02_Wyniki_Badan/Wynik_${date}_${result.id.slice(0, 8)}.json`,
          });
        }
      }
    }

    // 4. Scalp Photos
    if (patient.scalpPhotos.length > 0) {
      const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../storage/uploads');
      for (const photo of patient.scalpPhotos) {
        const fileName = photo.filename || (photo.filePath ? path.basename(photo.filePath) : '');
        if (!fileName || !isSafeFileName(fileName)) continue;
        const photoPath = path.join(uploadDir, fileName);
        if (fs.existsSync(photoPath)) {
          const buf = fs.readFileSync(photoPath);
          const photoFileName = photo.originalFilename || `zdjecie_${photo.id.slice(0, 8)}.jpg`;
          archive.append(buf, { name: `${basePath}/03_Zdjecia/${photoFileName}` });
          totalPhotos++;
        }
      }
    }

    // 5. Care Plans
    if (patient.carePlans.length > 0) {
      for (const plan of patient.carePlans) {
        try {
          const pdf = await generateCarePlanPDF(plan);
          const planName = plan.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
          archive.append(pdf, { name: `${basePath}/04_Plany_Opieki/Plan_${planName}_${plan.id.slice(0, 8)}.pdf` });
          totalCarePlans++;
        } catch (err) {
          console.warn(`  WARN: PDF planu ${plan.id}: ${err}`);
        }
      }
    }
  }

  // Summary
  const summary = {
    exportDate: new Date().toISOString(),
    exportedBy: 'system-backup (cron)',
    totalPatients: patients.length,
    totalConsultations,
    totalLabResults,
    totalCarePlans,
    totalPhotos,
  };
  archive.append(JSON.stringify(summary, null, 2), { name: '00_SUMMARY.json' });

  await archive.finalize();

  // Wait for the output stream to finish writing
  await new Promise<void>((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
  });

  const fileSize = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
  console.log(`[${new Date().toISOString()}] Eksport zakończony: ${zipFileName} (${fileSize} MB)`);
  console.log(`  Pacjenci: ${patients.length}, Konsultacje: ${totalConsultations}, Wyniki: ${totalLabResults}, Zdjęcia: ${totalPhotos}, Plany: ${totalCarePlans}`);

  // Output the zip path for the calling script
  console.log(`ZIP_PATH=${zipPath}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
