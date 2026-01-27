import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/emailService';
import { generateConsultationPDF, generateCarePlanPDF } from '../services/pdfService';
import { renderEmailTemplate, TemplateVariables } from '../utils/emailTemplateRenderer';
import { getLogoHTML } from '../utils/logo';
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
    
    // Try to get email template, fallback to default if not found
    let template = await prisma.emailTemplate.findFirst({
      where: {
        type: 'CONSULTATION',
        isDefault: true,
        isActive: true,
      },
    });

    // If no default template, use hardcoded fallback
    const consultationDate = new Date(consultation.consultationDate).toLocaleDateString('pl-PL');
    const variables: TemplateVariables = {
      patientName: `${consultation.patient.firstName} ${consultation.patient.lastName}`,
      patientFirstName: consultation.patient.firstName,
      patientLastName: consultation.patient.lastName,
      patientEmail: consultation.patient.email || '',
      patientPhone: consultation.patient.phone || '',
      doctorName: consultation.doctor.name,
      consultationDate,
    };

    let subject: string;
    let htmlBody: string;

    if (template) {
      subject = renderEmailTemplate(template.subject, variables);
      htmlBody = renderEmailTemplate(template.htmlBody, variables);
    } else {
      // Fallback to default
      subject = `Konsultacja trychologiczna - ${consultation.patient.firstName} ${consultation.patient.lastName}`;
      htmlBody = `
        <h2>Konsultacja trychologiczna</h2>
        <p>Dzień dobry,</p>
        <p>W załączeniu przesyłamy szczegóły konsultacji z dnia ${consultationDate}.</p>
        <p>Pacjent: ${consultation.patient.firstName} ${consultation.patient.lastName}</p>
        <p>Lekarz: ${consultation.doctor.name}</p>
        <p>Pozdrawiamy,<br>Zespół kliniki</p>
      `;
    }

    const message = `W załączeniu przesyłamy szczegóły konsultacji z dnia ${consultationDate}.`;

    try {
      await sendEmail({
        to: recipientEmail,
        subject,
        html: htmlBody,
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
    
    // Try to get email template, fallback to default if not found
    let template = await prisma.emailTemplate.findFirst({
      where: {
        type: 'CARE_PLAN',
        isDefault: true,
        isActive: true,
      },
    });

    const variables: TemplateVariables = {
      patientName: `${carePlan.patient.firstName} ${carePlan.patient.lastName}`,
      patientFirstName: carePlan.patient.firstName,
      patientLastName: carePlan.patient.lastName,
      patientEmail: carePlan.patient.email || '',
      patientPhone: carePlan.patient.phone || '',
      doctorName: carePlan.createdBy.name,
      carePlanTitle: carePlan.title,
      carePlanDuration: `${carePlan.totalDurationWeeks} tygodni`,
    };

    let subject: string;
    let htmlBody: string;

    if (template) {
      subject = renderEmailTemplate(template.subject, variables);
      htmlBody = renderEmailTemplate(template.htmlBody, variables);
    } else {
      // Fallback to default
      subject = `Plan opieki trychologicznej - ${carePlan.patient.firstName} ${carePlan.patient.lastName}`;
      htmlBody = `
        <h2>Plan opieki trychologicznej</h2>
        <p>Dzień dobry,</p>
        <p>W załączeniu przesyłamy Twój indywidualny plan opieki trychologicznej: ${carePlan.title} (${carePlan.totalDurationWeeks} tygodni).</p>
        <p>Pacjent: ${carePlan.patient.firstName} ${carePlan.patient.lastName}</p>
        <p>Lekarz: ${carePlan.createdBy.name}</p>
        <p>Pozdrawiamy,<br>Zespół kliniki</p>
      `;
    }

    const message = `W załączeniu przesyłamy Twój indywidualny plan opieki trychologicznej: ${carePlan.title} (${carePlan.totalDurationWeeks} tygodni).`;

    try {
      await sendEmail({
        to: recipientEmail,
        subject,
        html: htmlBody,
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

// Send lab result email
router.post('/lab-result/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Adres email odbiorcy jest wymagany' });
    }

    const labResult = await prisma.labResult.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    });

    if (!labResult) {
      return res.status(404).json({ error: 'Wynik badania nie znaleziony' });
    }

    // Create a simple text summary of lab results
    let labSummary = `Wyniki badań laboratoryjnych z dnia ${new Date(labResult.date).toLocaleDateString('pl-PL')}\n\n`;
    
    const fields = [
      { key: 'hgb', label: 'Hemoglobina', unit: labResult.hgbUnit, value: labResult.hgb, refLow: labResult.hgbRefLow, refHigh: labResult.hgbRefHigh, flag: labResult.hgbFlag },
      { key: 'rbc', label: 'Erytrocyty', unit: labResult.rbcUnit, value: labResult.rbc, refLow: labResult.rbcRefLow, refHigh: labResult.rbcRefHigh, flag: labResult.rbcFlag },
      { key: 'wbc', label: 'Leukocyty', unit: labResult.wbcUnit, value: labResult.wbc, refLow: labResult.wbcRefLow, refHigh: labResult.wbcRefHigh, flag: labResult.wbcFlag },
      { key: 'plt', label: 'Płytki krwi', unit: labResult.pltUnit, value: labResult.plt, refLow: labResult.pltRefLow, refHigh: labResult.pltRefHigh, flag: labResult.pltFlag },
      { key: 'crp', label: 'CRP', unit: labResult.crpUnit, value: labResult.crp, refLow: labResult.crpRefLow, refHigh: labResult.crpRefHigh, flag: labResult.crpFlag },
      { key: 'iron', label: 'Żelazo', unit: labResult.ironUnit, value: labResult.iron, refLow: labResult.ironRefLow, refHigh: labResult.ironRefHigh, flag: labResult.ironFlag },
      { key: 'ferritin', label: 'Ferrytyna', unit: labResult.ferritinUnit, value: labResult.ferritin, refLow: labResult.ferritinRefLow, refHigh: labResult.ferritinRefHigh, flag: labResult.ferritinFlag },
      { key: 'vitaminD3', label: 'Witamina D3', unit: labResult.vitaminD3Unit, value: labResult.vitaminD3, refLow: labResult.vitaminD3RefLow, refHigh: labResult.vitaminD3RefHigh, flag: labResult.vitaminD3Flag },
      { key: 'vitaminB12', label: 'Witamina B12', unit: labResult.vitaminB12Unit, value: labResult.vitaminB12, refLow: labResult.vitaminB12RefLow, refHigh: labResult.vitaminB12RefHigh, flag: labResult.vitaminB12Flag },
      { key: 'folicAcid', label: 'Kwas foliowy', unit: labResult.folicAcidUnit, value: labResult.folicAcid, refLow: labResult.folicAcidRefLow, refHigh: labResult.folicAcidRefHigh, flag: labResult.folicAcidFlag },
      { key: 'tsh', label: 'TSH', unit: labResult.tshUnit, value: labResult.tsh, refLow: labResult.tshRefLow, refHigh: labResult.tshRefHigh, flag: labResult.tshFlag },
      { key: 'ft3', label: 'FT3', unit: labResult.ft3Unit, value: labResult.ft3, refLow: labResult.ft3RefLow, refHigh: labResult.ft3RefHigh, flag: labResult.ft3Flag },
      { key: 'ft4', label: 'FT4', unit: labResult.ft4Unit, value: labResult.ft4, refLow: labResult.ft4RefLow, refHigh: labResult.ft4RefHigh, flag: labResult.ft4Flag },
    ];

    fields.forEach(field => {
      if (field.value !== null && field.value !== undefined) {
        labSummary += `${field.label}: ${field.value} ${field.unit || ''}`;
        if (field.refLow !== null && field.refHigh !== null) {
          labSummary += ` (norma: ${field.refLow}-${field.refHigh})`;
        }
        if (field.flag) {
          labSummary += ` [${field.flag}]`;
        }
        labSummary += '\n';
      }
    });

    if (labResult.notes) {
      labSummary += `\nUwagi: ${labResult.notes}`;
    }

    // Try to get email template, fallback to default if not found
    let template = await prisma.emailTemplate.findFirst({
      where: {
        type: 'LAB_RESULT',
        isDefault: true,
        isActive: true,
      },
    });

    const labResultDate = new Date(labResult.date).toLocaleDateString('pl-PL');
    const variables: TemplateVariables = {
      patientName: `${labResult.patient.firstName} ${labResult.patient.lastName}`,
      patientFirstName: labResult.patient.firstName,
      patientLastName: labResult.patient.lastName,
      patientEmail: labResult.patient.email || '',
      patientPhone: labResult.patient.phone || '',
      labResultDate,
    };

    let subject: string;
    let htmlBody: string;

    if (template) {
      subject = renderEmailTemplate(template.subject, variables);
      // Add lab summary to the template body
      htmlBody = renderEmailTemplate(template.htmlBody, variables);
      // Insert lab summary before closing tags
      htmlBody = htmlBody.replace(
        '</p>',
        `</p><pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap;">${labSummary}</pre>`
      );
    } else {
      // Fallback to default
      subject = `Wyniki badań laboratoryjnych - ${labResult.patient.firstName} ${labResult.patient.lastName}`;
      htmlBody = `
        <h2>Wyniki badań laboratoryjnych</h2>
        <p>Dzień dobry,</p>
        <p>W załączeniu przesyłamy wyniki badań laboratoryjnych z dnia ${labResultDate}.</p>
        <p>Pacjent: ${labResult.patient.firstName} ${labResult.patient.lastName}</p>
        <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap;">${labSummary}</pre>
        <p>Pozdrawiamy,<br>Zespół kliniki</p>
      `;
    }

    const message = `W załączeniu przesyłamy wyniki badań laboratoryjnych z dnia ${labResultDate}.`;

    try {
      await sendEmail({
        to: recipientEmail,
        subject,
        html: htmlBody,
      });

      // Save to email history
      await prisma.emailHistory.create({
        data: {
          patientId: labResult.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject,
          message,
          attachmentCount: 0,
          attachmentNames: [],
          status: 'SENT',
        },
      });

      res.json({ message: 'Email wysłany pomyślnie' });
    } catch (emailError: any) {
      // Save failed email to history
      await prisma.emailHistory.create({
        data: {
          patientId: labResult.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject,
          message,
          attachmentCount: 0,
          attachmentNames: [],
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

// Send scalp photo email
router.post('/scalp-photo/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Adres email odbiorcy jest wymagany' });
    }

    const scalpPhoto = await prisma.scalpPhoto.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    });

    if (!scalpPhoto) {
      return res.status(404).json({ error: 'Zdjęcie nie znalezione' });
    }

    // Read the image file
    const imagePath = scalpPhoto.filePath;
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Plik zdjęcia nie istnieje' });
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const imageExtension = path.extname(scalpPhoto.originalFilename || imagePath).toLowerCase();
    const mimeType = imageExtension === '.jpg' || imageExtension === '.jpeg' ? 'image/jpeg' : 
                     imageExtension === '.png' ? 'image/png' : 'image/jpeg';

    const subject = `Zdjęcie skóry głowy - ${scalpPhoto.patient.firstName} ${scalpPhoto.patient.lastName}`;
    const message = `W załączeniu przesyłamy zdjęcie skóry głowy z dnia ${new Date(scalpPhoto.createdAt).toLocaleDateString('pl-PL')}.${scalpPhoto.notes ? `\n\nUwagi: ${scalpPhoto.notes}` : ''}`;

    try {
      await sendEmail({
        to: recipientEmail,
        subject,
        html: `
          <h2>Zdjęcie skóry głowy</h2>
          <p>Dzień dobry,</p>
          <p>W załączeniu przesyłamy zdjęcie skóry głowy z dnia ${new Date(scalpPhoto.createdAt).toLocaleDateString('pl-PL')}.</p>
          ${scalpPhoto.notes ? `<p><strong>Uwagi:</strong> ${scalpPhoto.notes}</p>` : ''}
          <p>Pacjent: ${scalpPhoto.patient.firstName} ${scalpPhoto.patient.lastName}</p>
          <p>Pozdrawiamy,<br>Zespół kliniki</p>
        `,
        attachments: [
          {
            filename: scalpPhoto.originalFilename || `zdjecie-${id}${imageExtension}`,
            content: imageBuffer,
            contentType: mimeType as string,
          } as any,
        ],
      });

      // Save to email history
      await prisma.emailHistory.create({
        data: {
          patientId: scalpPhoto.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject,
          message,
          attachmentCount: 1,
          attachmentNames: [scalpPhoto.originalFilename || 'Zdjęcie skóry głowy'],
          status: 'SENT',
        },
      });

      res.json({ message: 'Email wysłany pomyślnie' });
    } catch (emailError: any) {
      // Save failed email to history
      await prisma.emailHistory.create({
        data: {
          patientId: scalpPhoto.patientId,
          sentByUserId: req.user!.id,
          recipientEmail,
          subject,
          message,
          attachmentCount: 1,
          attachmentNames: [scalpPhoto.originalFilename || 'Zdjęcie skóry głowy'],
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


