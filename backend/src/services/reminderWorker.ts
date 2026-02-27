import { sendEmail } from './emailService';
import { generateCarePlanPDF } from './pdfService';
import { getLogoHTML } from '../utils/logo';
import { prisma } from '../prisma';
import { generateVisitICS, generateGoogleCalendarURL, generateOutlookCalendarURL } from '../utils/icalendar';
import { generateActionToken } from '../utils/appointmentToken';

const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find reminders that should be sent (within next 5 minutes)
    const reminders = await prisma.emailReminder.findMany({
      where: {
        status: 'PENDING',
        sendAt: {
          lte: fiveMinutesFromNow,
          gte: now,
        },
      },
      include: {
        patient: true,
        carePlan: {
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
            },
          },
        },
      },
    });

    for (const reminder of reminders) {
      try {
        let emailHtml = '';
        let attachments: Array<{ filename: string; content: Buffer }> = [];

        switch (reminder.type) {
          case 'CARE_PLAN_REMINDER':
            if (reminder.carePlan) {
              emailHtml = `
                ${getLogoHTML()}
                <h2>Przypomnienie o planie opieki</h2>
                <p>Dzień dobry ${reminder.patient.firstName},</p>
                <p>Przypominamy o kontynuowaniu planu opieki trychologicznej: <strong>${reminder.carePlan.title}</strong></p>
                <p>W załączeniu znajdziesz aktualny plan opieki.</p>
                <p>Pozdrawiamy,<br>Zespół kliniki</p>
              `;

              const pdfBuffer = await generateCarePlanPDF(reminder.carePlan);
              attachments.push({
                filename: `plan-opieki-${reminder.carePlan.id}.pdf`,
                content: pdfBuffer,
              });
            } else {
              emailHtml = reminder.bodyPreview || reminder.subject;
            }
            break;

          case 'FOLLOW_UP_VISIT':
            emailHtml = `
              ${getLogoHTML()}
              <h2>Przypomnienie o wizycie kontrolnej</h2>
              <p>Dzień dobry ${reminder.patient.firstName},</p>
              <p>Przypominamy o zaplanowanej wizycie kontrolnej.</p>
              ${reminder.bodyPreview ? `<p>${reminder.bodyPreview}</p>` : ''}
              <p>Pozdrawiamy,<br>Zespół kliniki</p>
            `;
            break;

          case 'LAB_RESULTS_REMINDER':
            emailHtml = `
              ${getLogoHTML()}
              <h2>Przypomnienie o wynikach badań</h2>
              <p>Dzień dobry ${reminder.patient.firstName},</p>
              <p>Przypominamy o konieczności wykonania badań laboratoryjnych.</p>
              ${reminder.bodyPreview ? `<p>${reminder.bodyPreview}</p>` : ''}
              <p>Pozdrawiamy,<br>Zespół kliniki</p>
            `;
            break;
        }

        if (reminder.patient.email) {
          await sendEmail({
            to: reminder.patient.email,
            subject: reminder.subject,
            html: emailHtml,
            attachments,
          });

          await prisma.emailReminder.update({
            where: { id: reminder.id },
            data: { status: 'SENT' },
          });

          console.log(`Przypomnienie wysłane: ${reminder.id}`);
        } else {
          await prisma.emailReminder.update({
            where: { id: reminder.id },
            data: { status: 'FAILED' },
          });

          console.log(`Przypomnienie nie wysłane - brak email pacjenta: ${reminder.id}`);
        }
      } catch (error) {
        console.error(`Błąd wysyłania przypomnienia ${reminder.id}:`, error);

        await prisma.emailReminder.update({
          where: { id: reminder.id },
          data: { status: 'FAILED' },
        });
      }
    }
  } catch (error) {
    console.error('Błąd w reminder worker:', error);
  }
};

const checkAndSendVisitReminders = async () => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const upcomingVisits = await prisma.visit.findMany({
      where: {
        status: 'ZAPLANOWANA',
        data: { gt: now },
        OR: [
          { data: { lte: in7Days }, reminder7DaysSent: false },
          { data: { lte: in3Days }, reminder3DaysSent: false },
          { data: { lte: in1Day }, reminder1DaySent: false },
        ]
      },
      include: {
        patient: { select: { id: true, firstName: true, email: true } },
      }
    });

    for (const visit of upcomingVisits) {
      if (!visit.patient.email) continue;

      const timeDiff = visit.data.getTime() - now.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      let reminderType = '';
      let updateData = {};

      if (daysDiff <= 1 && !visit.reminder1DaySent) {
        reminderType = '1 dzień';
        updateData = { reminder1DaySent: true, reminder3DaysSent: true, reminder7DaysSent: true };
      } else if (daysDiff <= 3 && !visit.reminder3DaysSent) {
        reminderType = '3 dni';
        updateData = { reminder3DaysSent: true, reminder7DaysSent: true };
      } else if (daysDiff <= 7 && !visit.reminder7DaysSent) {
        reminderType = '7 dni';
        updateData = { reminder7DaysSent: true };
      } else {
        continue;
      }

      // Hack to adapt visit object to calendar format generator which expects a structure
      const calendarVisitObj = visit as any;
      const googleCalendarURL = generateGoogleCalendarURL(calendarVisitObj);
      const outlookCalendarURL = generateOutlookCalendarURL(calendarVisitObj);
      const icsContent = generateVisitICS(calendarVisitObj);

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
            <h1>Przypomnienie o wizycie (za ${reminderType})</h1>
          </div>
          <div class="content">
            <p>Dzień dobry ${visit.patient.firstName},</p>
            <p>Przypominamy o zbliżającej się wizycie:</p>
            <div class="visit-info">
              <p><strong>Rodzaj zabiegu:</strong> ${visit.rodzajZabiegu}</p>
              <p><strong>Data:</strong> ${visit.data.toLocaleDateString('pl-PL')}</p>
              <p><strong>Godzina:</strong> ${visit.data.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            
            <div class="calendar-buttons">
              <a href="${googleCalendarURL}" class="calendar-button" target="_blank">Google Calendar</a>
              <a href="${outlookCalendarURL}" class="calendar-button" target="_blank">Outlook</a>
            </div>
          </div>
          <div class="footer">
            Wiadomość wygenerowana automatycznie.
          </div>
        </div>
      </body>
      </html>
      `;

      try {
        await sendEmail({
          to: visit.patient.email,
          subject: `Przypomnienie o wizycie - za ${reminderType}`,
          html: emailHtml,
          attachments: [{
            filename: 'wizyta.ics',
            content: Buffer.from(icsContent, 'utf-8')
          }]
        });

        await prisma.visit.update({
          where: { id: visit.id },
          data: updateData
        });

        console.log(`✅ Wysłano przypomnienie (${reminderType}) o wizycie do: ${visit.patient.email}`);
      } catch (e) {
        console.error('Błąd wysyłania automatycznego przypomnienia (wizyta):', e);
      }
    }

  } catch (error) {
    console.error('Błąd w checkAndSendVisitReminders:', error);
  }
};

const checkAndSendActionReminders = async () => {
  try {
    const reminderHours = parseInt(process.env.REMINDER_HOURS_BEFORE || '24', 10);
    const now = new Date();
    const windowStart = new Date(now.getTime() + (reminderHours - 0.5) * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + (reminderHours + 0.5) * 60 * 60 * 1000);

    const visits = await prisma.visit.findMany({
      where: {
        status: { in: ['ZAPLANOWANA', 'POTWIERDZONA'] } as any,
        reminderWithActionsSent: false,
        data: { gte: windowStart, lte: windowEnd },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const baseUrl = (process.env.APP_BASE_URL || '').replace(/\/$/, '');

    for (const visit of visits) {
      if (!visit.patient.email) continue;

      const confirmToken   = generateActionToken(visit.id, 'confirm');
      const cancelToken    = generateActionToken(visit.id, 'cancel');
      const rescheduleToken = generateActionToken(visit.id, 'reschedule');

      const confirmUrl   = `${baseUrl}/api/appointment-actions?token=${confirmToken}`;
      const cancelUrl    = `${baseUrl}/api/appointment-actions?token=${cancelToken}`;
      const rescheduleUrl = `${baseUrl}/api/appointment-actions?token=${rescheduleToken}`;

      const visitDate = new Date(visit.data);
      const visitDateFormatted = visitDate.toLocaleDateString('pl-PL', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
      });

      const googleCalendarURL = generateGoogleCalendarURL(visit as any);
      const outlookCalendarURL = generateOutlookCalendarURL(visit as any);
      const icsContent = generateVisitICS(visit as any);

      // Fetch clinicPhone from first available specialist settings
      const settingsRow = await prisma.specialistSettings.findFirst({
        where: { clinicPhone: { not: null } },
      });
      const clinicPhone = settingsRow?.clinicPhone ?? null;

      const rescheduleHint = clinicPhone
        ? `<p style="font-size:14px;color:#555;margin-top:6px;">Aby zmienić termin, zadzwoń pod <a href="tel:${clinicPhone}" style="color:#1976d2;font-weight:bold;">${clinicPhone}</a> lub kliknij przycisk poniżej.</p>`
        : '';

      const emailHtml = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0}
    .wrap{max-width:600px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
    .header{background:#1976d2;color:white;padding:24px 28px;text-align:center}
    .header h1{margin:0;font-size:22px}
    .body{padding:28px 32px}
    .visit-info{background:#f5f8ff;border-left:4px solid #1976d2;border-radius:4px;padding:18px 20px;margin:20px 0}
    .visit-info p{margin:6px 0;font-size:15px}
    .actions{margin:28px 0;text-align:center}
    .actions p{font-weight:600;margin-bottom:14px;font-size:15px;color:#1d1d1f}
    .btn{display:inline-block;padding:13px 24px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;color:white;margin:6px 8px}
    .btn-confirm{background:#34C759}
    .btn-cancel{background:#FF3B30}
    .btn-reschedule{background:#FF9500}
    .calendar-section{margin:24px 0;text-align:center;padding-top:16px;border-top:1px solid #eee}
    .cal-btn{display:inline-block;margin:6px;padding:9px 18px;background:#1976d2;color:white;text-decoration:none;border-radius:6px;font-size:13px}
    .footer{margin-top:28px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center}
  </style>
</head>
<body>
<div class="wrap">
  ${getLogoHTML()}
  <div class="header"><h1>Przypomnienie o wizycie</h1></div>
  <div class="body">
    <p>Dzień dobry <strong>${visit.patient.firstName}</strong>,</p>
    <p>Przypominamy o Twojej zaplanowanej wizycie:</p>
    <div class="visit-info">
      <p><strong>Zabieg:</strong> ${visit.rodzajZabiegu}</p>
      <p><strong>Data i godzina:</strong> ${visitDateFormatted}</p>
      ${visit.notatki ? `<p><strong>Notatki:</strong> ${visit.notatki}</p>` : ''}
    </div>
    <div class="actions">
      <p>Prosimy potwierdzić Twoją obecność lub poinformować nas o zmianie planów:</p>
      <a href="${confirmUrl}" class="btn btn-confirm">✅ Potwierdzam wizytę</a>
      <a href="${cancelUrl}" class="btn btn-cancel">❌ Anuluję wizytę</a>
      <br>
      <a href="${rescheduleUrl}" class="btn btn-reschedule">🔄 Proszę o zmianę terminu</a>
      ${rescheduleHint}
    </div>
    <p style="font-size:13px;color:#888;text-align:center;">Linki są ważne przez 48 godzin.</p>
    <div class="calendar-section">
      <p style="font-weight:600;font-size:14px;margin-bottom:10px">Zapisz do kalendarza:</p>
      <a href="${googleCalendarURL}" class="cal-btn" target="_blank">📅 Google Calendar</a>
      <a href="${outlookCalendarURL}" class="cal-btn" target="_blank">📅 Outlook</a>
    </div>
    <div class="footer">Pozdrawiamy, Zespół Kliniki Trichologii<br>Wiadomość wygenerowana automatycznie.</div>
  </div>
</div>
</body>
</html>`;

      try {
        await sendEmail({
          to: visit.patient.email,
          subject: `Przypomnienie o wizycie — ${visitDateFormatted}`,
          html: emailHtml,
          attachments: [{ filename: 'wizyta.ics', content: Buffer.from(icsContent, 'utf-8') }],
        });

        await prisma.visit.update({
          where: { id: visit.id },
          data: { reminderWithActionsSent: true },
        });

        await prisma.notificationLog.create({
          data: {
            visitId: visit.id,
            type: 'appointment_reminder',
            recipient: visit.patient.email,
            status: 'sent',
          },
        });

        console.log(`✅ [ActionReminder] Wysłano przypomnienie z przyciskami do: ${visit.patient.email}`);
      } catch (e) {
        console.error('[ActionReminder] Błąd wysyłania:', e);
        await prisma.notificationLog.create({
          data: {
            visitId: visit.id,
            type: 'appointment_reminder',
            recipient: visit.patient.email,
            status: 'failed',
          },
        });
      }
    }
  } catch (err) {
    console.error('[ActionReminder] Błąd workera:', err);
  }
};

export const startReminderWorker = () => {
  console.log('🔄 Reminder worker uruchomiony');

  // Check immediately
  checkAndSendReminders();
  checkAndSendVisitReminders();
  checkAndSendActionReminders();

  // Then check every 5 minutes
  setInterval(() => {
    checkAndSendReminders();
    checkAndSendVisitReminders();
    checkAndSendActionReminders();
  }, 5 * 60 * 1000);
};


