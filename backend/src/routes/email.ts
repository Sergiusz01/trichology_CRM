import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/emailService';
import { generateConsultationPDF, generateCarePlanPDF } from '../services/pdfService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../storage/email-attachments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const reminderSchema = z.object({
  carePlanId: z.string().optional(),
  type: z.enum(['CARE_PLAN_REMINDER', 'FOLLOW_UP_VISIT', 'LAB_RESULTS_REMINDER']),
  sendAt: z.string().datetime(),
  subject: z.string().min(1, 'Temat jest wymagany'),
  bodyPreview: z.string().optional(),
});

// Send consultation email
router.post('/consultation/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Adres email odbiorcy jest wymagany' });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Konsultacja nie znaleziona' });
    }

    const pdfBuffer = await generateConsultationPDF(consultation);
    const subject = `Konsultacja trychologiczna - ${consultation.patient.firstName} ${consultation.patient.lastName}`;
    const message = `W załączeniu przesyłamy szczegóły konsultacji z dnia ${new Date(consultation.consultationDate).toLocaleDateString('pl-PL')}.`;

    try {
      await sendEmail({
        to: recipientEmail,
        subject,
        html: `
          <h2>Konsultacja trychologiczna</h2>
          <p>Dzień dobry,</p>
          <p>${message}</p>
          <p>Pacjent: ${consultation.patient.firstName} ${consultation.patient.lastName}</p>
          <p>Lekarz: ${consultation.doctor.name}</p>
          <p>Pozdrawiamy,<br>Zespół kliniki</p>
        `,
        attachments: [
          {
            filename: `konsultacja-${id}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      // Save to email history
      await prisma.emailHistory.create({
        data: {
          patientId: consultation.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject,
          message,
          consultationId: id,
          attachmentCount: 1,
          attachmentNames: ['Konsultacja (PDF)'],
          status: 'SENT',
        },
      });

      res.json({ message: 'Email wysłany pomyślnie' });
    } catch (emailError: any) {
      // Save failed email to history
      await prisma.emailHistory.create({
        data: {
          patientId: consultation.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject,
          message,
          consultationId: id,
          attachmentCount: 1,
          attachmentNames: ['Konsultacja (PDF)'],
          status: 'FAILED',
          errorMessage: emailError.message,
        },
      });
      throw emailError;
    }
  } catch (error) {
    next(error);
  }
});

// Send care plan email
router.post('/care-plan/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Adres email odbiorcy jest wymagany' });
    }

    const carePlan = await prisma.carePlan.findUnique({
      where: { id },
      include: {
        patient: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        weeks: {
          orderBy: { weekNumber: 'asc' },
        },
      },
    });

    if (!carePlan) {
      return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
    }

    const pdfBuffer = await generateCarePlanPDF(carePlan);
    const subject = `Plan opieki trychologicznej - ${carePlan.patient.firstName} ${carePlan.patient.lastName}`;
    const message = `W załączeniu przesyłamy Twój indywidualny plan opieki trychologicznej: ${carePlan.title} (${carePlan.totalDurationWeeks} tygodni).`;

    try {
      await sendEmail({
        to: recipientEmail,
        subject,
        html: `
          <h2>Plan opieki trychologicznej</h2>
          <p>Dzień dobry,</p>
          <p>${message}</p>
          <p>Pacjent: ${carePlan.patient.firstName} ${carePlan.patient.lastName}</p>
          <p>Lekarz: ${carePlan.createdBy.name}</p>
          <p>Pozdrawiamy,<br>Zespół kliniki</p>
        `,
        attachments: [
          {
            filename: `plan-opieki-${id}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      // Save to email history
      await prisma.emailHistory.create({
        data: {
          patientId: carePlan.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject,
          message,
          carePlanId: id,
          attachmentCount: 1,
          attachmentNames: ['Plan opieki (PDF)'],
          status: 'SENT',
        },
      });

      res.json({ message: 'Email wysłany pomyślnie' });
    } catch (emailError: any) {
      // Save failed email to history
      await prisma.emailHistory.create({
        data: {
          patientId: carePlan.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject,
          message,
          carePlanId: id,
          attachmentCount: 1,
          attachmentNames: ['Plan opieki (PDF)'],
          status: 'FAILED',
          errorMessage: emailError.message,
        },
      });
      throw emailError;
    }
  } catch (error) {
    next(error);
  }
});

// Create reminder
router.post('/reminders', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = reminderSchema.parse(req.body);
    const createdByUserId = req.user!.id;

    // Verify patient exists (from carePlan or we need patientId in schema)
    // For now, assume carePlanId is provided and we get patient from there
    let patientId: string;

    if (data.carePlanId) {
      const carePlan = await prisma.carePlan.findUnique({
        where: { id: data.carePlanId },
        select: { patientId: true },
      });

      if (!carePlan) {
        return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
      }

      patientId = carePlan.patientId;
    } else {
      // If no carePlanId, we need patientId in the request
      const { patientId: reqPatientId } = req.body;
      if (!reqPatientId) {
        return res.status(400).json({ error: 'Wymagane jest patientId lub carePlanId' });
      }
      patientId = reqPatientId;
    }

    const reminder = await prisma.emailReminder.create({
      data: {
        ...data,
        patientId,
        carePlanId: data.carePlanId || undefined,
        createdByUserId,
        sendAt: new Date(data.sendAt),
      },
    });

    res.status(201).json({ reminder });
  } catch (error) {
    next(error);
  }
});

// Get reminders for a patient
router.get('/reminders/patient/:patientId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { patientId } = req.params;

    const reminders = await prisma.emailReminder.findMany({
      where: { patientId },
      orderBy: { sendAt: 'asc' },
      include: {
        carePlan: {
          select: { id: true, title: true },
        },
      },
    });

    res.json({ reminders });
  } catch (error) {
    next(error);
  }
});

// Update reminder
router.put('/reminders/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = reminderSchema.partial().parse(req.body);

    const reminder = await prisma.emailReminder.update({
      where: { id },
      data: {
        ...data,
        sendAt: data.sendAt ? new Date(data.sendAt) : undefined,
      },
    });

    res.json({ reminder });
  } catch (error) {
    next(error);
  }
});

// Delete reminder
router.delete('/reminders/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    await prisma.emailReminder.delete({
      where: { id },
    });

    res.json({ message: 'Przypomnienie usunięte' });
  } catch (error) {
    next(error);
  }
});

// Test email connection
router.get('/test-connection', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { verifyEmailConnection } = await import('../services/emailService');
    const isValid = await verifyEmailConnection();

    if (isValid) {
      res.json({
        success: true,
        message: 'Połączenie z serwerem SMTP działa poprawnie',
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE,
          user: process.env.SMTP_USER ? '***' : 'BRAK',
          from: process.env.EMAIL_FROM,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Nie można połączyć się z serwerem SMTP',
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE,
          user: process.env.SMTP_USER ? '***' : 'BRAK',
          from: process.env.EMAIL_FROM,
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Błąd testowania połączenia email',
      error: error.message,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE,
        user: process.env.SMTP_USER ? '***' : 'BRAK',
        from: process.env.EMAIL_FROM,
      },
    });
  }
});

// Get email history for a patient
router.get('/history/patient/:patientId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { patientId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [emails, total] = await Promise.all([
      prisma.emailHistory.findMany({
        where: { patientId },
        skip,
        take: limitNum,
        orderBy: { sentAt: 'desc' },
        include: {
          sentBy: { select: { id: true, name: true, email: true } },
          consultation: { select: { id: true, consultationDate: true } },
          carePlan: { select: { id: true, title: true } },
        },
      }),
      prisma.emailHistory.count({ where: { patientId } }),
    ]);

    res.json({
      emails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get all email history (for admin/doctor)
router.get('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '50', patientId, status } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (patientId) {
      where.patientId = patientId as string;
    }
    if (status) {
      where.status = status as string;
    }

    const [emails, total] = await Promise.all([
      prisma.emailHistory.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { sentAt: 'desc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          sentBy: { select: { id: true, name: true, email: true } },
          consultation: { select: { id: true, consultationDate: true } },
          carePlan: { select: { id: true, title: true } },
        },
      }),
      prisma.emailHistory.count({ where }),
    ]);

    res.json({
      emails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single email history entry
router.get('/history/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const email = await prisma.emailHistory.findUnique({
      where: { id },
      include: {
        patient: true,
        sentBy: { select: { id: true, name: true, email: true } },
        consultation: { select: { id: true, consultationDate: true } },
        carePlan: { select: { id: true, title: true } },
      },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email nie znaleziony w historii' });
    }

    res.json({ email });
  } catch (error) {
    next(error);
  }
});

// Send test email
router.post('/test', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Adres email odbiorcy jest wymagany' });
    }

    await sendEmail({
      to,
      subject: 'Test email z systemu trychologicznego',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Test email</h2>
          <p>To jest testowy email z systemu zarządzania konsultacjami trychologicznymi.</p>
          <p>Jeśli otrzymałeś tę wiadomość, oznacza to, że konfiguracja email działa poprawnie.</p>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Data wysłania: ${new Date().toLocaleString('pl-PL')}
          </p>
        </div>
      `,
    });

    res.json({ message: 'Testowy email wysłany pomyślnie' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Błąd wysyłania testowego emaila',
      message: error.message,
    });
  }
});

// Send custom email to patient
const sendEmailSchema = z.object({
  patientId: z.string().min(1, 'ID pacjenta jest wymagane'),
  subject: z.string().min(1, 'Temat jest wymagany'),
  message: z.string().min(1, 'Treść wiadomości jest wymagana'),
  recipientEmail: z.string().email('Nieprawidłowy adres email').optional(),
  attachConsultationId: z.string().optional(),
  attachCarePlanId: z.string().optional(),
});

router.post('/send', authenticate, upload.array('attachments', 5), async (req: AuthRequest, res, next) => {
  try {
    const data = sendEmailSchema.parse(req.body);
    const files = req.files as Express.Multer.File[];

    // Get patient
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    }

    const recipientEmail = data.recipientEmail || patient.email;
    if (!recipientEmail) {
      return res.status(400).json({ error: 'Brak adresu email pacjenta' });
    }

    const attachments: Array<{ filename: string; content: Buffer }> = [];

    // Attach consultation PDF if requested
    if (data.attachConsultationId) {
      const consultation = await prisma.consultation.findUnique({
        where: { id: data.attachConsultationId },
        include: {
          patient: true,
          doctor: { select: { id: true, name: true, email: true } },
        },
      });

      if (consultation) {
        const pdfBuffer = await generateConsultationPDF(consultation);
        attachments.push({
          filename: `konsultacja-${consultation.patient.lastName}-${consultation.patient.firstName}-${new Date(consultation.consultationDate).toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
        });
      }
    }

    // Attach care plan PDF if requested
    if (data.attachCarePlanId) {
      const carePlan = await prisma.carePlan.findUnique({
        where: { id: data.attachCarePlanId },
        include: {
          patient: true,
          createdBy: { select: { id: true, name: true, email: true } },
          weeks: { orderBy: { weekNumber: 'asc' } },
        },
      });

      if (carePlan) {
        const pdfBuffer = await generateCarePlanPDF(carePlan);
        attachments.push({
          filename: `plan-opieki-${carePlan.patient.lastName}-${carePlan.patient.firstName}-${carePlan.title}.pdf`,
          content: pdfBuffer,
        });
      }
    }

    // Attach uploaded files
    if (files && files.length > 0) {
      for (const file of files) {
        const fileBuffer = fs.readFileSync(file.path);
        attachments.push({
          filename: file.originalname,
          content: fileBuffer,
        });
        // Clean up uploaded file after reading
        fs.unlinkSync(file.path);
      }
    }

    // Get current user (doctor)
    const doctor = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, email: true },
    });

    const attachmentNames: string[] = [];
    
    // Collect attachment names
    if (data.attachConsultationId) {
      attachmentNames.push('Konsultacja (PDF)');
    }
    if (data.attachCarePlanId) {
      attachmentNames.push('Plan opieki (PDF)');
    }
    if (files && files.length > 0) {
      files.forEach((file) => attachmentNames.push(file.originalname));
    }

    try {
      await sendEmail({
        to: recipientEmail,
        subject: data.subject,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>${data.subject}</h2>
            <p>Dzień dobry ${patient.firstName} ${patient.lastName},</p>
            <div style="white-space: pre-wrap;">${data.message}</div>
            ${doctor ? `<p style="margin-top: 20px;">Z poważaniem,<br><strong>${doctor.name}</strong></p>` : ''}
          </div>
        `,
        attachments,
      });

      // Save to email history
      await prisma.emailHistory.create({
        data: {
          patientId: data.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject: data.subject,
          message: data.message,
          consultationId: data.attachConsultationId || undefined,
          carePlanId: data.attachCarePlanId || undefined,
          attachmentCount: attachments.length,
          attachmentNames,
          status: 'SENT',
        },
      });

      res.json({ message: 'Email wysłany pomyślnie' });
    } catch (emailError: any) {
      // Save failed email to history
      await prisma.emailHistory.create({
        data: {
          patientId: data.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject: data.subject,
          message: data.message,
          consultationId: data.attachConsultationId || undefined,
          carePlanId: data.attachCarePlanId || undefined,
          attachmentCount: attachments.length,
          attachmentNames,
          status: 'FAILED',
          errorMessage: emailError.message,
        },
      });
      throw emailError;
    }
  } catch (error) {
    next(error);
  }
});

export default router;


