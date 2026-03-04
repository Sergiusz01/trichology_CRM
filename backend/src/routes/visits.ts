import express from 'express';
import { VisitStatus } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireWriteAccess, AuthRequest } from '../middleware/auth';
import { canAccessPatient } from '../middleware/authorizePatientAccess';
import { prisma } from '../prisma';
import { writeAuditLog } from '../services/auditService';
import { sendEmail } from '../services/emailService';
import { generateVisitICS, generateGoogleCalendarURL, generateOutlookCalendarURL } from '../utils/icalendar';
import { getLogoHTML } from '../utils/logo';

const router = express.Router();

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const visitStatusValues = ['ZAPLANOWANA', 'ODBYTA', 'NIEOBECNOSC', 'ANULOWANA'] as const;

const visitSchema = z.object({
  patientId: z.string().min(1, 'ID pacjenta jest wymagane'),
  data: z.string().min(1, 'Data jest wymagana'),
  rodzajZabiegu: z.string().min(1, 'Rodzaj zabiegu jest wymagany'),
  notatki: z.string().optional().nullable(),
  status: z.enum(visitStatusValues).optional().default('ZAPLANOWANA'),
  numerWSerii: z.number().int().positive().optional().nullable(),
  liczbaSerii: z.number().int().positive().optional().nullable(),
  cena: z.number().nonnegative().optional().nullable(),
});

const updateVisitSchema = z.object({
  data: z.string().optional(),
  rodzajZabiegu: z.string().min(1).optional(),
  notatki: z.string().optional().nullable(),
  status: z.enum(visitStatusValues).optional(),
  numerWSerii: z.number().int().positive().optional().nullable(),
  liczbaSerii: z.number().int().positive().optional().nullable(),
  cena: z.number().nonnegative().optional().nullable(),
});

// Get all visits (optionally filtered by date range)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { start, end } = req.query;

    const where: any = {};

    // [C-1] Defence-in-depth: scope to accessible visits
    const user = req.user!;
    if (user.role !== 'ADMIN') {
      if (user.clinicId) where.patient = { clinicId: user.clinicId };
      if (user.role === 'DOCTOR') {
        where.patient = {
          ...(where.patient || {}),
          assignedDoctorId: user.id,
        };
      }
    }

    if (start && end) {
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Nieprawidłowy format daty. Użyj formatu ISO 8601.' });
      }
      if (startDate > endDate) {
        return res.status(400).json({ error: 'Data początkowa nie może być późniejsza niż data końcowa.' });
      }
      where.data = {
        gte: startDate,
        lte: endDate,
      };
    }

    const visits = await prisma.visit.findMany({
      where,
      orderBy: { data: 'asc' },
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

    res.json({ data: visits });
  } catch (error) {
    next(error);
  }
});

// Get all visits for a specific patient
router.get('/patient/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // [C-1] verify patient access
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });
    if (!patient) return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    if (!canAccessPatient(req.user!, patient)) {
      console.warn(`[SECURITY] Unauthorized visit list: userId=${req.user!.id} patientId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tego pacjenta' });
    }

    const visits = await prisma.visit.findMany({
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
  } catch (error) {
    next(error);
  }
});

// Get upcoming visits (for dashboard) - next 6 visits from today with status ZAPLANOWANA
router.get('/upcoming', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // [C-1] scope upcoming visits to user's accessible patients
    const upcomingUser = req.user!;
    const upcomingPatientFilter: any = {};
    if (upcomingUser.role !== 'ADMIN') {
      if (upcomingUser.clinicId) upcomingPatientFilter.clinicId = upcomingUser.clinicId;
      if (upcomingUser.role === 'DOCTOR') {
        upcomingPatientFilter.assignedDoctorId = upcomingUser.id;
      }
    }

    const visits = await prisma.visit.findMany({
      where: {
        data: { gte: today },
        status: 'ZAPLANOWANA',
        ...(Object.keys(upcomingPatientFilter).length > 0 ? { patient: upcomingPatientFilter } : {}),
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
  } catch (error) {
    next(error);
  }
});

// Get weekly revenue statistics
router.get('/stats/weekly-revenue', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    // Planned revenue (ZAPLANOWANA visits this week)
    const plannedVisits = await prisma.visit.findMany({
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
    const completedVisits = await prisma.visit.findMany({
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
    const visitsByStatus = await prisma.visit.groupBy({
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

    const statusCounts: Record<string, number> = {};
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
  } catch (error) {
    next(error);
  }
});

// Get visit by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
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

    // [C-1] access check via the visit's patient
    const visitPatient = await prisma.patient.findUnique({
      where: { id: visit.patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });
    if (!visitPatient || !canAccessPatient(req.user!, visitPatient)) {
      console.warn(`[SECURITY] Unauthorized visit GET: userId=${req.user!.id} visitId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej wizyty' });
    }

    res.json({ visit });
  } catch (error) {
    next(error);
  }
});

// Create new visit (all authenticated users can create visits)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = visitSchema.parse(req.body);

    // Verify patient exists AND access
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Pacjent nie znaleziony' });
    }

    // [C-1] access check
    if (!canAccessPatient(req.user!, patient)) {
      console.warn(`[SECURITY] Unauthorized visit POST: userId=${req.user!.id} patientId=${data.patientId} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tego pacjenta' });
    }

    // Parse the date - the frontend sends a local datetime string (YYYY-MM-DDTHH:mm)
    // The datetime-local input gives us local time without timezone info
    // We need to treat it as UTC to preserve the exact hour/minute the user selected
    // This way, when displayed back, it will show the same hour/minute
    let visitDate: Date;
    if (data.data.includes('T')) {
      // Format: YYYY-MM-DDTHH:mm (datetime-local format)
      // Parse as UTC to preserve the exact time the user entered
      const [datePart, timePart] = data.data.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      // Create date as UTC to preserve the exact hour/minute
      // This ensures that when read back and displayed, it shows the same time
      visitDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    } else {
      visitDate = new Date(data.data);
    }

    const now = new Date();
    now.setSeconds(0, 0); // Remove seconds and milliseconds for comparison

    // Validate: Planned visits cannot be in the past
    const status = (data.status || 'ZAPLANOWANA') as VisitStatus;
    if (status === 'ZAPLANOWANA' && visitDate < now) {
      return res.status(400).json({
        error: 'Błąd walidacji',
        message: 'Wizyta ze statusem "Zaplanowana" nie może być w przeszłości',
      });
    }

    // Check for duplicate visit (same date and time for the same patient)
    const existingVisit = await prisma.visit.findFirst({
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

    const visit = await prisma.visit.create({
      data: {
        patientId: data.patientId,
        data: visitDate,
        rodzajZabiegu: data.rodzajZabiegu,
        notatki: data.notatki,
        status: data.status as VisitStatus,
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

    await writeAuditLog(req, {
      action: 'CREATE_VISIT',
      entity: 'Visit',
      entityId: visit.id,
    });

    res.status(201).json({ visit });
  } catch (error) {
    next(error);
  }
});

// Update visit (DOCTOR/ADMIN only - ASSISTANT can only create)
router.put('/:id', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = updateVisitSchema.parse(req.body);

    // Get existing visit
    const existingVisit = await prisma.visit.findUnique({
      where: { id },
    });

    if (!existingVisit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    // [C-1] access check via visit's patient
    const visitPatientForUpdate = await prisma.patient.findUnique({
      where: { id: existingVisit.patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });
    if (!visitPatientForUpdate || !canAccessPatient(req.user!, visitPatientForUpdate)) {
      console.warn(`[SECURITY] Unauthorized visit PUT: userId=${req.user!.id} visitId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej wizyty' });
    }

    // Parse date if provided
    const updateData: any = {};
    if (data.data) {
      // Parse the date - the frontend sends a local datetime string (YYYY-MM-DDTHH:mm)
      // The datetime-local input gives us local time without timezone info
      // We need to treat it as UTC to preserve the exact hour/minute the user selected
      let visitDate: Date;
      if (data.data.includes('T')) {
        // Format: YYYY-MM-DDTHH:mm (datetime-local format)
        // Parse as UTC to preserve the exact time the user entered
        const [datePart, timePart] = data.data.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        // Create date as UTC to preserve the exact hour/minute
        // This ensures that when read back and displayed, it shows the same time
        visitDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
      } else {
        visitDate = new Date(data.data);
      }

      const now = new Date();
      now.setSeconds(0, 0); // Remove seconds and milliseconds for comparison

      // Validate: Planned visits cannot be in the past
      const newStatus = (data.status || existingVisit.status) as VisitStatus;
      if (newStatus === 'ZAPLANOWANA' && visitDate < now) {
        return res.status(400).json({
          error: 'Błąd walidacji',
          message: 'Wizyta ze statusem "Zaplanowana" nie może być w przeszłości',
        });
      }

      // Check for duplicate visit (same date and time for the same patient, excluding current visit)
      const duplicateVisit = await prisma.visit.findFirst({
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
    if (data.rodzajZabiegu) updateData.rodzajZabiegu = data.rodzajZabiegu;
    if (data.notatki !== undefined) updateData.notatki = data.notatki;
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
      updateData.status = data.status as VisitStatus;
    }
    if (data.numerWSerii !== undefined) updateData.numerWSerii = data.numerWSerii;
    if (data.liczbaSerii !== undefined) updateData.liczbaSerii = data.liczbaSerii;
    if (data.cena !== undefined) updateData.cena = data.cena;

    const visit = await prisma.visit.update({
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

    await writeAuditLog(req, {
      action: 'UPDATE_VISIT',
      entity: 'Visit',
      entityId: visit.id,
    });

    res.json({ visit });
  } catch (error) {
    next(error);
  }
});

// Quick status update (all authenticated users can update status)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!visitStatusValues.includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status wizyty' });
    }

    const existingVisit = await prisma.visit.findUnique({
      where: { id },
    });

    if (!existingVisit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    // [C-1] access check
    const statusPatient = await prisma.patient.findUnique({
      where: { id: existingVisit.patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });
    if (!statusPatient || !canAccessPatient(req.user!, statusPatient)) {
      console.warn(`[SECURITY] Unauthorized status PATCH: userId=${req.user!.id} visitId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej wizyty' });
    }

    const visit = await prisma.visit.update({
      where: { id },
      data: { status: status as VisitStatus },
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

    await writeAuditLog(req, {
      action: 'UPDATE_VISIT',
      entity: 'Visit',
      entityId: visit.id,
    });

    res.json({ visit });
  } catch (error) {
    next(error);
  }
});

// Delete visit (DOCTOR/ADMIN only - ASSISTANT cannot delete visits)
router.delete('/:id', authenticate, requireWriteAccess(), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    // [C-1] access check
    const deletePatient = await prisma.patient.findUnique({
      where: { id: visit.patientId },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });
    if (!deletePatient || !canAccessPatient(req.user!, deletePatient)) {
      console.warn(`[SECURITY] Unauthorized visit DELETE: userId=${req.user!.id} visitId=${id} ip=${req.ip}`);
      return res.status(403).json({ error: 'Brak dostępu do tej wizyty' });
    }

    await prisma.visit.delete({
      where: { id },
    });

    // Audit log
    await writeAuditLog(req, {
      action: 'DELETE_VISIT',
      entity: 'Visit',
      entityId: id,
    });

    res.json({ message: 'Wizyta została usunięta' });
  } catch (error) {
    next(error);
  }
});

// Download ICS for visit
router.get('/:id/ics', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true } }
      }
    });

    if (!visit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    const calendarVisitObj = visit as any;
    const icsContent = generateVisitICS(calendarVisitObj);

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="wizyta_${id}.ics"`);
    res.send(icsContent);
  } catch (error) {
    next(error);
  }
});

// Get Calendar Links for visit
router.get('/:id/calendar-links', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true } }
      }
    });

    if (!visit) {
      return res.status(404).json({ error: 'Wizyta nie znaleziona' });
    }

    const calendarVisitObj = visit as any;
    const googleCalendarURL = generateGoogleCalendarURL(calendarVisitObj);
    const outlookCalendarURL = generateOutlookCalendarURL(calendarVisitObj);

    res.json({ googleCalendarURL, outlookCalendarURL });
  } catch (error) {
    next(error);
  }
});

// Send visit reminder email
router.post('/:id/reminder', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customMessage } = req.body;

    const visit = await prisma.visit.findUnique({
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
      timeZone: 'UTC',
    });

    // Generate calendar links
    const googleCalendarURL = generateGoogleCalendarURL(visit);
    const outlookCalendarURL = generateOutlookCalendarURL(visit);
    const icsContent = generateVisitICS(visit);

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
          ${getLogoHTML()}
          <div class="header">
            <h1>Przypomnienie o wizycie</h1>
          </div>
          <div class="content">
            <p>Dzień dobry ${escapeHtml(visit.patient.firstName)},</p>
            <p>Przypominamy o zaplanowanej wizycie:</p>

            <div class="visit-info">
              <h2 style="margin-top: 0; color: #1976d2;">${escapeHtml(visit.rodzajZabiegu)}</h2>
              <p><strong>Data i godzina:</strong> ${visitDateFormatted}</p>
              ${visit.notatki ? `<p><strong>Notatki:</strong> ${escapeHtml(visit.notatki)}</p>` : ''}
            </div>

            ${customMessage ? `<p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;"><strong>Wiadomość:</strong><br>${escapeHtml(customMessage)}</p>` : ''}

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
      await sendEmail({
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
      await prisma.emailHistory.create({
        data: {
          patientId: visit.patientId,
          sentByUserId: req.user!.id,
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
    } catch (emailError: any) {
      console.error('Błąd wysyłania przypomnienia:', emailError);

      // Save failed email to history
      await prisma.emailHistory.create({
        data: {
          patientId: visit.patientId,
          sentByUserId: req.user!.id,
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
  } catch (error: any) {
    next(error);
  }
});

export default router;
