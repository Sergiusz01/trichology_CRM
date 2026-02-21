import express from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { generateConsultationPDF, generateCarePlanPDF, generateLabResultPDF, generatePatientInfoPDF } from '../services/pdfService';
import { prisma } from '../prisma';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Export all patients data to ZIP
// Only ADMIN and DOCTOR can export data
router.get('/patients/zip', authenticate, requireRole('ADMIN', 'DOCTOR'), async (req: AuthRequest, res, next) => {
  try {
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `eksport-pacjentow-${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Błąd podczas tworzenia archiwum' });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Get all patients (not archived)
    const patients = await prisma.patient.findMany({
      where: {
        isArchived: false,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      include: {
        consultations: {
          include: {
            doctor: {
              select: { id: true, name: true, email: true },
            },
            patient: {
              select: { id: true, firstName: true, lastName: true, age: true, gender: true, phone: true, email: true },
            },
          },
          orderBy: { consultationDate: 'desc' },
        },
        labResults: {
          orderBy: { date: 'desc' },
        },
        scalpPhotos: {
          include: {
            annotations: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        carePlans: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            patient: {
              select: { id: true, firstName: true, lastName: true, phone: true, email: true },
            },
            weeks: {
              orderBy: { weekNumber: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Process each patient
    for (const patient of patients) {
      // Sanitize patient name for folder name
      const patientFolderName = `${patient.lastName}_${patient.firstName}_${patient.id.slice(0, 8)}`
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/\s+/g, '_');

      const basePath = `Pacjenci/${patientFolderName}`;

      // 1. Patient info (PDF)
      try {
        const patientInfoPdf = await generatePatientInfoPDF(patient);
        archive.append(patientInfoPdf, {
          name: `${basePath}/00_Informacje_Pacjenta.pdf`,
        });
      } catch (error) {
        console.error(`Error generating patient info PDF for ${patient.id}:`, error);
        archive.append(JSON.stringify({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          age: patient.age,
          gender: patient.gender,
          occupation: patient.occupation,
          address: patient.address,
          phone: patient.phone,
          email: patient.email,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
        }, null, 2), {
          name: `${basePath}/00_Informacje_Pacjenta.json`,
        });
      }

      // 2. Consultations (PDF only)
      if (patient.consultations.length > 0) {
        // Generate PDF for each consultation
        for (const consultation of patient.consultations) {
          try {
            const pdfBuffer = await generateConsultationPDF(consultation);
            const consultationDate = new Date(consultation.consultationDate)
              .toISOString()
              .split('T')[0]
              .replace(/-/g, '');
            const consultationFileName = `Konsultacja_${consultationDate}_${consultation.id.slice(0, 8)}.pdf`;
            archive.append(pdfBuffer, {
              name: `${basePath}/01_Konsultacje/${consultationFileName}`,
            });
          } catch (error) {
            console.error(`Error generating PDF for consultation ${consultation.id}:`, error);
            // Continue with other consultations
          }
        }
      } else {
        archive.append('Brak konsultacji', {
          name: `${basePath}/01_Konsultacje/BRAK_KONSULTACJI.txt`,
        });
      }

      // 3. Lab Results (PDF only)
      if (patient.labResults.length > 0) {
        // Generate PDF for each lab result
        for (const result of patient.labResults) {
          try {
            const pdfBuffer = await generateLabResultPDF(result, patient);
            const resultDate = new Date(result.date).toISOString().split('T')[0].replace(/-/g, '');
            const resultFileName = `Wynik_${resultDate}_${result.id.slice(0, 8)}.pdf`;
            archive.append(pdfBuffer, {
              name: `${basePath}/02_Wyniki_Badan/${resultFileName}`,
            });
          } catch (error) {
            console.error(`Error generating PDF for lab result ${result.id}:`, error);
            // Fallback to JSON if PDF generation fails
            const resultDate = new Date(result.date).toISOString().split('T')[0].replace(/-/g, '');
            archive.append(JSON.stringify(result, null, 2), {
              name: `${basePath}/02_Wyniki_Badan/Wynik_${resultDate}_${result.id.slice(0, 8)}.json`,
            });
          }
        }
      } else {
        archive.append('Brak wyników badań', {
          name: `${basePath}/02_Wyniki_Badan/BRAK_WYNIKOW.txt`,
        });
      }

      // 4. Scalp Photos (images only, no JSON)
      if (patient.scalpPhotos.length > 0) {
        // Copy actual image files
        for (const photo of patient.scalpPhotos) {
          const fileName = photo.filename || (photo.filePath ? path.basename(photo.filePath) : '');
          if (!fileName) continue;

          const photoPath = path.join(__dirname, '../../storage/uploads', fileName);
          if (fs.existsSync(photoPath)) {
            const fileBuffer = fs.readFileSync(photoPath);
            const photoFileName = photo.originalFilename || `zdjecie_${photo.id.slice(0, 8)}.jpg`;
            archive.append(fileBuffer, {
              name: `${basePath}/03_Zdjecia_Skory_Glowy/${photoFileName}`,
            });
          } else {
            archive.append(`Plik nie znaleziony: ${photo.filePath}`, {
              name: `${basePath}/03_Zdjecia_Skory_Glowy/BRAK_PLIKU_${photo.id.slice(0, 8)}.txt`,
            });
          }
        }
      } else {
        archive.append('Brak zdjęć', {
          name: `${basePath}/03_Zdjecia_Skory_Glowy/BRAK_ZDJEC.txt`,
        });
      }

      // 5. Care Plans (PDF only)
      if (patient.carePlans.length > 0) {
        // Generate PDF for each care plan
        for (const carePlan of patient.carePlans) {
          try {
            const pdfBuffer = await generateCarePlanPDF(carePlan);
            const planFileName = `Plan_${carePlan.title.replace(/[^a-zA-Z0-9]/g, '_')}_${carePlan.id.slice(0, 8)}.pdf`;
            archive.append(pdfBuffer, {
              name: `${basePath}/04_Plany_Opieki/${planFileName}`,
            });
          } catch (error) {
            console.error(`Error generating PDF for care plan ${carePlan.id}:`, error);
            // Continue with other care plans
          }
        }
      } else {
        archive.append('Brak planów opieki', {
          name: `${basePath}/04_Plany_Opieki/BRAK_PLANOW.txt`,
        });
      }
    }

    // Add summary file
    const summary = {
      exportDate: new Date().toISOString(),
      exportedBy: req.user?.email || 'Unknown',
      totalPatients: patients.length,
      totalConsultations: patients.reduce((sum, p) => sum + p.consultations.length, 0),
      totalLabResults: patients.reduce((sum, p) => sum + p.labResults.length, 0),
      totalScalpPhotos: patients.reduce((sum, p) => sum + p.scalpPhotos.length, 0),
      totalCarePlans: patients.reduce((sum, p) => sum + p.carePlans.length, 0),
    };
    archive.append(JSON.stringify(summary, null, 2), {
      name: '00_SUMMARY.json',
    });

    // Finalize archive
    await archive.finalize();

  } catch (error) {
    console.error('Export error:', error);
    if (!res.headersSent) {
      next(error);
    }
  }
});

export default router;

