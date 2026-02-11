"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const emailService_1 = require("../services/emailService");
const pdfService_1 = require("../services/pdfService");
const emailTemplateRenderer_1 = require("../utils/emailTemplateRenderer");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Configure multer for file uploads
const uploadDir = path_1.default.join(__dirname, '../../storage/email-attachments');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
        },
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
const reminderSchema = zod_1.z.object({
    carePlanId: zod_1.z.string().optional(),
    type: zod_1.z.enum(['CARE_PLAN_REMINDER', 'FOLLOW_UP_VISIT', 'LAB_RESULTS_REMINDER']),
    sendAt: zod_1.z.string().datetime(),
    subject: zod_1.z.string().min(1, 'Temat jest wymagany'),
    bodyPreview: zod_1.z.string().optional(),
});
// Send consultation email
router.post('/consultation/:id', auth_1.authenticate, async (req, res, next) => {
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
        const pdfBuffer = await (0, pdfService_1.generateConsultationPDF)(consultation);
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
        const variables = {
            patientName: `${consultation.patient.firstName} ${consultation.patient.lastName}`,
            patientFirstName: consultation.patient.firstName,
            patientLastName: consultation.patient.lastName,
            patientEmail: consultation.patient.email || '',
            patientPhone: consultation.patient.phone || '',
            doctorName: consultation.doctor.name,
            consultationDate,
        };
        let subject;
        let htmlBody;
        if (template) {
            subject = (0, emailTemplateRenderer_1.renderEmailTemplate)(template.subject, variables);
            htmlBody = (0, emailTemplateRenderer_1.renderEmailTemplate)(template.htmlBody, variables);
        }
        else {
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
            await (0, emailService_1.sendEmail)({
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
                    sentByUserId: req.user.id,
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
        }
        catch (emailError) {
            // Save failed email to history
            await prisma.emailHistory.create({
                data: {
                    patientId: consultation.patientId,
                    sentByUserId: req.user.id,
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
    }
    catch (error) {
        next(error);
    }
});
// Send care plan email
router.post('/care-plan/:id', auth_1.authenticate, async (req, res, next) => {
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
        const pdfBuffer = await (0, pdfService_1.generateCarePlanPDF)(carePlan);
        // Try to get email template, fallback to default if not found
        let template = await prisma.emailTemplate.findFirst({
            where: {
                type: 'CARE_PLAN',
                isDefault: true,
                isActive: true,
            },
        });
        const variables = {
            patientName: `${carePlan.patient.firstName} ${carePlan.patient.lastName}`,
            patientFirstName: carePlan.patient.firstName,
            patientLastName: carePlan.patient.lastName,
            patientEmail: carePlan.patient.email || '',
            patientPhone: carePlan.patient.phone || '',
            doctorName: carePlan.createdBy.name,
            carePlanTitle: carePlan.title,
            carePlanDuration: `${carePlan.totalDurationWeeks} tygodni`,
        };
        let subject;
        let htmlBody;
        if (template) {
            subject = (0, emailTemplateRenderer_1.renderEmailTemplate)(template.subject, variables);
            htmlBody = (0, emailTemplateRenderer_1.renderEmailTemplate)(template.htmlBody, variables);
        }
        else {
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
            await (0, emailService_1.sendEmail)({
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
                    sentByUserId: req.user.id,
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
        }
        catch (emailError) {
            // Save failed email to history
            await prisma.emailHistory.create({
                data: {
                    patientId: carePlan.patientId,
                    sentByUserId: req.user.id,
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
    }
    catch (error) {
        next(error);
    }
});
// Create reminder
router.post('/reminders', auth_1.authenticate, async (req, res, next) => {
    try {
        const data = reminderSchema.parse(req.body);
        const createdByUserId = req.user.id;
        // Verify patient exists (from carePlan or we need patientId in schema)
        // For now, assume carePlanId is provided and we get patient from there
        let patientId;
        if (data.carePlanId) {
            const carePlan = await prisma.carePlan.findUnique({
                where: { id: data.carePlanId },
                select: { patientId: true },
            });
            if (!carePlan) {
                return res.status(404).json({ error: 'Plan opieki nie znaleziony' });
            }
            patientId = carePlan.patientId;
        }
        else {
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
    }
    catch (error) {
        next(error);
    }
});
// Get reminders for a patient
router.get('/reminders/patient/:patientId', auth_1.authenticate, async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
});
// Update reminder
router.put('/reminders/:id', auth_1.authenticate, async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
});
// Delete reminder
router.delete('/reminders/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.emailReminder.delete({
            where: { id },
        });
        res.json({ message: 'Przypomnienie usunięte' });
    }
    catch (error) {
        next(error);
    }
});
// Test email connection
router.get('/test-connection', auth_1.authenticate, async (req, res, next) => {
    try {
        const { verifyEmailConnection } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
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
        }
        else {
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
    }
    catch (error) {
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
router.get('/history/patient/:patientId', auth_1.authenticate, async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
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
    }
    catch (error) {
        next(error);
    }
});
// Get all email history (for admin/doctor)
router.get('/history', auth_1.authenticate, async (req, res, next) => {
    try {
        const { page = '1', limit = '50', patientId, status } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (patientId) {
            where.patientId = patientId;
        }
        if (status) {
            where.status = status;
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
    }
    catch (error) {
        next(error);
    }
});
// Get single email history entry
router.get('/history/:id', auth_1.authenticate, async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
});
// Send test email
router.post('/test', auth_1.authenticate, async (req, res, next) => {
    try {
        const { to } = req.body;
        if (!to) {
            return res.status(400).json({ error: 'Adres email odbiorcy jest wymagany' });
        }
        await (0, emailService_1.sendEmail)({
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
    }
    catch (error) {
        res.status(500).json({
            error: 'Błąd wysyłania testowego emaila',
            message: error.message,
        });
    }
});
// Send custom email to patient
const sendEmailSchema = zod_1.z.object({
    patientId: zod_1.z.string().min(1, 'ID pacjenta jest wymagane'),
    subject: zod_1.z.string().min(1, 'Temat jest wymagany'),
    message: zod_1.z.string().min(1, 'Treść wiadomości jest wymagana'),
    recipientEmail: zod_1.z.string().email('Nieprawidłowy adres email').optional(),
    attachConsultationId: zod_1.z.string().optional(),
    attachCarePlanId: zod_1.z.string().optional(),
});
router.post('/send', auth_1.authenticate, upload.array('attachments', 5), async (req, res, next) => {
    try {
        const data = sendEmailSchema.parse(req.body);
        const files = req.files;
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
        const attachments = [];
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
                const pdfBuffer = await (0, pdfService_1.generateConsultationPDF)(consultation);
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
                const pdfBuffer = await (0, pdfService_1.generateCarePlanPDF)(carePlan);
                attachments.push({
                    filename: `plan-opieki-${carePlan.patient.lastName}-${carePlan.patient.firstName}-${carePlan.title}.pdf`,
                    content: pdfBuffer,
                });
            }
        }
        // Attach uploaded files
        if (files && files.length > 0) {
            for (const file of files) {
                const fileBuffer = fs_1.default.readFileSync(file.path);
                attachments.push({
                    filename: file.originalname,
                    content: fileBuffer,
                });
                // Clean up uploaded file after reading
                fs_1.default.unlinkSync(file.path);
            }
        }
        // Get current user (doctor)
        const doctor = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { name: true, email: true },
        });
        const attachmentNames = [];
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
            await (0, emailService_1.sendEmail)({
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
                    sentByUserId: req.user.id,
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
        }
        catch (emailError) {
            // Save failed email to history
            await prisma.emailHistory.create({
                data: {
                    patientId: data.patientId,
                    sentByUserId: req.user.id,
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
    }
    catch (error) {
        next(error);
    }
});
// Send lab result email
router.post('/lab-result/:id', auth_1.authenticate, async (req, res, next) => {
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
        const variables = {
            patientName: `${labResult.patient.firstName} ${labResult.patient.lastName}`,
            patientFirstName: labResult.patient.firstName,
            patientLastName: labResult.patient.lastName,
            patientEmail: labResult.patient.email || '',
            patientPhone: labResult.patient.phone || '',
            labResultDate,
        };
        let subject;
        let htmlBody;
        if (template) {
            subject = (0, emailTemplateRenderer_1.renderEmailTemplate)(template.subject, variables);
            // Add lab summary to the template body
            htmlBody = (0, emailTemplateRenderer_1.renderEmailTemplate)(template.htmlBody, variables);
            // Insert lab summary before closing tags
            htmlBody = htmlBody.replace('</p>', `</p><pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap;">${labSummary}</pre>`);
        }
        else {
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
            await (0, emailService_1.sendEmail)({
                to: recipientEmail,
                subject,
                html: htmlBody,
            });
            // Save to email history
            await prisma.emailHistory.create({
                data: {
                    patientId: labResult.patientId,
                    sentByUserId: req.user.id,
                    recipientEmail,
                    subject,
                    message,
                    attachmentCount: 0,
                    attachmentNames: [],
                    status: 'SENT',
                },
            });
            res.json({ message: 'Email wysłany pomyślnie' });
        }
        catch (emailError) {
            // Save failed email to history
            await prisma.emailHistory.create({
                data: {
                    patientId: labResult.patientId,
                    sentByUserId: req.user.id,
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
    }
    catch (error) {
        next(error);
    }
});
// Send scalp photo email
router.post('/scalp-photo/:id', auth_1.authenticate, async (req, res, next) => {
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
        if (!fs_1.default.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Plik zdjęcia nie istnieje' });
        }
        const imageBuffer = fs_1.default.readFileSync(imagePath);
        const imageExtension = path_1.default.extname(scalpPhoto.originalFilename || imagePath).toLowerCase();
        const mimeType = imageExtension === '.jpg' || imageExtension === '.jpeg' ? 'image/jpeg' :
            imageExtension === '.png' ? 'image/png' : 'image/jpeg';
        const subject = `Zdjęcie skóry głowy - ${scalpPhoto.patient.firstName} ${scalpPhoto.patient.lastName}`;
        const message = `W załączeniu przesyłamy zdjęcie skóry głowy z dnia ${new Date(scalpPhoto.createdAt).toLocaleDateString('pl-PL')}.${scalpPhoto.notes ? `\n\nUwagi: ${scalpPhoto.notes}` : ''}`;
        try {
            await (0, emailService_1.sendEmail)({
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
                        contentType: mimeType,
                    },
                ],
            });
            // Save to email history
            await prisma.emailHistory.create({
                data: {
                    patientId: scalpPhoto.patientId,
                    sentByUserId: req.user.id,
                    recipientEmail,
                    subject,
                    message,
                    attachmentCount: 1,
                    attachmentNames: [scalpPhoto.originalFilename || 'Zdjęcie skóry głowy'],
                    status: 'SENT',
                },
            });
            res.json({ message: 'Email wysłany pomyślnie' });
        }
        catch (emailError) {
            // Save failed email to history
            await prisma.emailHistory.create({
                data: {
                    patientId: scalpPhoto.patientId,
                    sentByUserId: req.user.id,
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=email.js.map