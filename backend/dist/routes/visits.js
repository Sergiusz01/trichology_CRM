"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const auditService_1 = require("../services/auditService");
const emailService_1 = require("../services/emailService");
const icalendar_1 = require("../utils/icalendar");
const logo_1 = require("../utils/logo");
const warsawTz_1 = require("../utils/warsawTz");
const router = express_1.default.Router();
const visitStatusValues = ['ZAPLANOWANA', 'ODBYTA', 'NIEOBECNOSC', 'ANULOWANA'];
const visitSchema = zod_1.z.object({
    patientId: zod_1.z.string().min(1, 'ID pacjenta jest wymagane'),
    data: zod_1.z.string().min(1, 'Data jest wymagana'),
    rodzajZabiegu: zod_1.z.string().min(1, 'Rodzaj zabiegu jest wymagany'),
    notatki: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(visitStatusValues).optional().default('ZAPLANOWANA'),
    numerWSerii: zod_1.z.number().int().positive().optional().nullable(),
    liczbaSerii: zod_1.z.number().int().positive().optional().nullable(),
    cena: zod_1.z.number().nonnegative().optional().nullable(),
});
const updateVisitSchema = zod_1.z.object({
    data: zod_1.z.string().optional(),
    rodzajZabiegu: zod_1.z.string().min(1).optional(),
    notatki: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(visitStatusValues).optional(),
    numerWSerii: zod_1.z.number().int().positive().optional().nullable(),
    liczbaSerii: zod_1.z.number().int().positive().optional().nullable(),
    cena: zod_1.z.number().nonnegative().optional().nullable(),
});
// Get all visits for a specific patient
router.get('/patient/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const visits = await prisma_1.prisma.visit.findMany({
            where: { patientId: id },
            orderBy: { data: 'desc' },
            select: {
                id: true,
                patientId: true,
                data: true,
                rodzajZabiegu: true,
                notatki: true,
                status: true,
                numerWSerii: true,
                liczbaSerii: true,
                cena: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json({ visits });
    }
    catch (error) {
        next(error);
    }
});
// Get upcoming visits (for dashboard) - next 6 visits from today (Europe/Warsaw) with status ZAPLANOWANA
router.get('/upcoming', auth_1.authenticate, async (req, res, next) => {
    try {
        const today = (0, warsawTz_1.startOfTodayWarsaw)();
        const visits = await prisma_1.prisma.visit.findMany({
            where: {
                data: {
                    gte: today,
                },
                status: 'ZAPLANOWANA',
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { data: 'asc' },
            take: 6,
        });
        res.json({ visits });
    }
    catch (error) {
        next(error);
    }
});
// Get weekly revenue statistics (week = Mon–Sun in Europe/Warsaw)
router.get('/stats/weekly-revenue', auth_1.authenticate, async (req, res, next) => {
    try {
        const { start: startOfWeek, end: endOfWeek } = (0, warsawTz_1.weekRangeWarsaw)();
        // Planned revenue (ZAPLANOWANA visits this week)
        const plannedVisits = await prisma_1.prisma.visit.findMany({
            where: {
                data: {
                    gte: startOfWeek,
                    lte: endOfWeek,
                },
                status: 'ZAPLANOWANA',
                cena: { not: null },
            },
            select: { cena: true },
        });
        // Completed revenue (ODBYTA visits this week)
        const completedVisits = await prisma_1.prisma.visit.findMany({
            where: {
                data: {
                    gte: startOfWeek,
                    lte: endOfWeek,
                },
                status: 'ODBYTA',
                cena: { not: null },
            },
            select: { cena: true },
        });
        // Count visits by status this week
        const visitsByStatus = await prisma_1.prisma.visit.groupBy({
            by: ['status'],
            where: {
                data: {
                    gte: startOfWeek,
                    lte: endOfWeek,
                },
            },
            _count: { id: true },
        });
        const plannedRevenue = plannedVisits.reduce((sum, v) => sum + (Number(v.cena) || 0), 0);
        const completedRevenue = completedVisits.reduce((sum, v) => sum + (Number(v.cena) || 0), 0);
        const statusCounts = {};
        visitsByStatus.forEach((item) => {
            statusCounts[item.status] = item._count.id;
        });
        res.json({
            plannedRevenue,
            completedRevenue,
            totalExpectedRevenue: plannedRevenue + completedRevenue,
            visitsThisWeek: {
                zaplanowana: statusCounts['ZAPLANOWANA'] || 0,
                odbyta: statusCounts['ODBYTA'] || 0,
                nieobecnosc: statusCounts['NIEOBECNOSC'] || 0,
                anulowana: statusCounts['ANULOWANA'] || 0,
            },
            weekRange: {
                start: startOfWeek.toISOString(),
                end: endOfWeek.toISOString(),
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Get visit by ID
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const visit = await prisma_1.prisma.visit.findUnique({
            where: { id },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!visit) {
            return res.status(404).json({ error: 'Wizyta nie znaleziona' });
        }
        res.json({ visit });
    }
    catch (error) {
        next(error);
    }
});
// Create new visit (all authenticated users can create visits)
router.post('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const data = visitSchema.parse(req.body);
        // Verify patient exists
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: data.patientId },
        });
        if (!patient) {
            return res.status(404).json({ error: 'Pacjent nie znaleziony' });
        }
        // Parse the date as Europe/Warsaw local (YYYY-MM-DDTHH:mm), store as UTC
        const visitDate = (0, warsawTz_1.parseWarsawToUtc)(data.data);
        const now = new Date();
        // Validate: Planned visits cannot be in the past
        const status = (data.status || 'ZAPLANOWANA');
        if (status === 'ZAPLANOWANA' && visitDate < now) {
            return res.status(400).json({
                error: 'Błąd walidacji',
                message: 'Wizyta ze statusem "Zaplanowana" nie może być w przeszłości',
            });
        }
        // Check for duplicate visit (same date and time for the same patient)
        const existingVisit = await prisma_1.prisma.visit.findFirst({
            where: {
                patientId: data.patientId,
                data: visitDate,
                status: {
                    not: 'ANULOWANA', // Allow duplicates if one is cancelled
                },
            },
        });
        if (existingVisit) {
            return res.status(409).json({
                error: 'Błąd walidacji',
                message: 'Na tę datę i godzinę już istnieje wizyta dla tego pacjenta',
            });
        }
        const visit = await prisma_1.prisma.visit.create({
            data: {
                patientId: data.patientId,
                data: visitDate,
                rodzajZabiegu: data.rodzajZabiegu,
                notatki: data.notatki,
                status: data.status,
                numerWSerii: data.numerWSerii,
                liczbaSerii: data.liczbaSerii,
                cena: data.cena,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        res.status(201).json({ visit });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'CREATE_VISIT',
            entity: 'Visit',
            entityId: visit.id,
        });
    }
    catch (error) {
        next(error);
    }
});
// Update visit (DOCTOR/ADMIN only - ASSISTANT can only create)
router.put('/:id', auth_1.authenticate, (0, auth_1.requireWriteAccess)(), async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = updateVisitSchema.parse(req.body);
        // Get existing visit
        const existingVisit = await prisma_1.prisma.visit.findUnique({
            where: { id },
        });
        if (!existingVisit) {
            return res.status(404).json({ error: 'Wizyta nie znaleziona' });
        }
        // Parse date if provided (Europe/Warsaw local → UTC)
        const updateData = {};
        if (data.data) {
            const visitDate = (0, warsawTz_1.parseWarsawToUtc)(data.data);
            const now = new Date();
            // Validate: Planned visits cannot be in the past
            const newStatus = (data.status || existingVisit.status);
            if (newStatus === 'ZAPLANOWANA' && visitDate < now) {
                return res.status(400).json({
                    error: 'Błąd walidacji',
                    message: 'Wizyta ze statusem "Zaplanowana" nie może być w przeszłości',
                });
            }
            // Check for duplicate visit (same date and time for the same patient, excluding current visit)
            const duplicateVisit = await prisma_1.prisma.visit.findFirst({
                where: {
                    patientId: existingVisit.patientId,
                    data: visitDate,
                    id: { not: id }, // Exclude current visit
                    status: {
                        not: 'ANULOWANA', // Allow duplicates if one is cancelled
                    },
                },
            });
            if (duplicateVisit) {
                return res.status(409).json({
                    error: 'Błąd walidacji',
                    message: 'Na tę datę i godzinę już istnieje wizyta dla tego pacjenta',
                });
            }
            updateData.data = visitDate;
        }
        if (data.rodzajZabiegu)
            updateData.rodzajZabiegu = data.rodzajZabiegu;
        if (data.notatki !== undefined)
            updateData.notatki = data.notatki;
        if (data.status) {
            // Validate status change: if changing to ZAPLANOWANA, check date
            if (data.status === 'ZAPLANOWANA') {
                const visitDate = updateData.data ? new Date(updateData.data) : existingVisit.data;
                const now = new Date();
                now.setSeconds(0, 0);
                if (visitDate < now) {
                    return res.status(400).json({
                        error: 'Błąd walidacji',
                        message: 'Wizyta ze statusem "Zaplanowana" nie może być w przeszłości',
                    });
                }
            }
            updateData.status = data.status;
        }
        if (data.numerWSerii !== undefined)
            updateData.numerWSerii = data.numerWSerii;
        if (data.liczbaSerii !== undefined)
            updateData.liczbaSerii = data.liczbaSerii;
        if (data.cena !== undefined)
            updateData.cena = data.cena;
        const visit = await prisma_1.prisma.visit.update({
            where: { id },
            data: updateData,
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        res.json({ visit });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'UPDATE_VISIT',
            entity: 'Visit',
            entityId: visit.id,
        });
    }
    catch (error) {
        next(error);
    }
});
// Quick status update (all authenticated users can update status)
router.patch('/:id/status', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!visitStatusValues.includes(status)) {
            return res.status(400).json({ error: 'Nieprawidłowy status wizyty' });
        }
        const existingVisit = await prisma_1.prisma.visit.findUnique({
            where: { id },
        });
        if (!existingVisit) {
            return res.status(404).json({ error: 'Wizyta nie znaleziona' });
        }
        const visit = await prisma_1.prisma.visit.update({
            where: { id },
            data: { status: status },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        res.json({ visit });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'UPDATE_VISIT_STATUS',
            entity: 'Visit',
            entityId: visit.id,
        });
    }
    catch (error) {
        next(error);
    }
});
// Delete visit (DOCTOR/ADMIN only - ASSISTANT cannot delete visits)
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireWriteAccess)(), async (req, res, next) => {
    try {
        const { id } = req.params;
        const visit = await prisma_1.prisma.visit.findUnique({
            where: { id },
        });
        if (!visit) {
            return res.status(404).json({ error: 'Wizyta nie znaleziona' });
        }
        await prisma_1.prisma.visit.delete({
            where: { id },
        });
        // Audit log
        await (0, auditService_1.writeAuditLog)(req, {
            action: 'DELETE_VISIT',
            entity: 'Visit',
            entityId: id,
        });
        res.json({ message: 'Wizyta została usunięta' });
    }
    catch (error) {
        next(error);
    }
});
// Send visit reminder email
router.post('/:id/reminder', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { recipientEmail, customMessage } = req.body;
        const visit = await prisma_1.prisma.visit.findUnique({
            where: { id },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        if (!visit) {
            return res.status(404).json({ error: 'Wizyta nie znaleziona' });
        }
        if (visit.status !== 'ZAPLANOWANA') {
            return res.status(400).json({ error: 'Można wysłać przypomnienie tylko dla wizyt zaplanowanych' });
        }
        const emailTo = recipientEmail || visit.patient.email;
        if (!emailTo) {
            return res.status(400).json({ error: 'Pacjent nie ma zapisanego adresu email' });
        }
        const visitDate = new Date(visit.data);
        const visitDateFormatted = visitDate.toLocaleDateString('pl-PL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        // Generate calendar links
        const googleCalendarURL = (0, icalendar_1.generateGoogleCalendarURL)(visit);
        const outlookCalendarURL = (0, icalendar_1.generateOutlookCalendarURL)(visit);
        const icsContent = (0, icalendar_1.generateVisitICS)(visit);
        // Create email HTML
        const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .visit-info { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1976d2; }
          .calendar-buttons { margin: 30px 0; text-align: center; }
          .calendar-button { display: inline-block; margin: 10px; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .calendar-button:hover { background-color: #1565c0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          ${(0, logo_1.getLogoHTML)()}
          <div class="header">
            <h1>Przypomnienie o wizycie</h1>
          </div>
          <div class="content">
            <p>Dzień dobry ${visit.patient.firstName},</p>
            <p>Przypominamy o zaplanowanej wizycie:</p>
            
            <div class="visit-info">
              <h2 style="margin-top: 0; color: #1976d2;">${visit.rodzajZabiegu}</h2>
              <p><strong>Data i godzina:</strong> ${visitDateFormatted}</p>
              ${visit.notatki ? `<p><strong>Notatki:</strong> ${visit.notatki}</p>` : ''}
            </div>

            ${customMessage ? `<p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;"><strong>Wiadomość:</strong><br>${customMessage}</p>` : ''}

            <div class="calendar-buttons">
              <p style="font-weight: bold; margin-bottom: 15px;">Zapisz do kalendarza:</p>
              <a href="${googleCalendarURL}" class="calendar-button" target="_blank">📅 Google Calendar</a>
              <a href="${outlookCalendarURL}" class="calendar-button" target="_blank">📅 Outlook Calendar</a>
              <a href="data:text/calendar;charset=utf8;base64,${Buffer.from(icsContent).toString('base64')}" download="wizyta-${visit.id}.ics" class="calendar-button">📥 Pobierz .ics</a>
            </div>

            <p>Prosimy o potwierdzenie obecności lub kontakt w przypadku potrzeby zmiany terminu.</p>
            
            <div class="footer">
              <p>Pozdrawiamy,<br>Zespół Kliniki</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
        const subject = `Przypomnienie o wizycie - ${visitDateFormatted}`;
        try {
            await (0, emailService_1.sendEmail)({
                to: emailTo,
                subject,
                html: emailHtml,
                attachments: [
                    {
                        filename: `wizyta-${visit.id}.ics`,
                        content: Buffer.from(icsContent),
                    },
                ],
            });
            // Save to email history
            await prisma_1.prisma.emailHistory.create({
                data: {
                    patientId: visit.patientId,
                    sentByUserId: req.user.id,
                    recipientEmail: emailTo,
                    subject,
                    message: customMessage || `Przypomnienie o wizycie: ${visit.rodzajZabiegu} - ${visitDateFormatted}`,
                    attachmentCount: 1,
                    attachmentNames: ['Wizyta (ICS)'],
                    status: 'SENT',
                },
            });
            res.json({
                message: 'Przypomnienie wysłane pomyślnie',
                googleCalendarURL,
                outlookCalendarURL,
            });
        }
        catch (emailError) {
            console.error('Błąd wysyłania przypomnienia:', emailError);
            // Save failed email to history
            await prisma_1.prisma.emailHistory.create({
                data: {
                    patientId: visit.patientId,
                    sentByUserId: req.user.id,
                    recipientEmail: emailTo,
                    subject,
                    message: customMessage || `Przypomnienie o wizycie: ${visit.rodzajZabiegu} - ${visitDateFormatted}`,
                    status: 'FAILED',
                },
            });
            return res.status(500).json({
                error: 'Błąd wysyłania emaila',
                details: emailError.message,
            });
        }
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=visits.js.map