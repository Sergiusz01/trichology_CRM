import { sendEmail } from './emailService';
import { generateCarePlanPDF } from './pdfService';
import { getLogoHTML } from '../utils/logo';
import { prisma } from '../prisma';
import { generateVisitICS, generateGoogleCalendarURL, generateOutlookCalendarURL } from '../utils/icalendar';
import { generateActionToken } from './appointmentTokenService';

const APP_BASE_URL = (): string => process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3001';

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

/**
 * Build action buttons HTML for visit reminder emails.
 * Includes: Confirm, Cancel, Reschedule (with clinic phone tel: link).
 */
function buildActionButtonsHTML(visitId: string, clinicPhone?: string | null): string {
  const baseUrl = APP_BASE_URL();
  const confirmToken = generateActionToken(visitId, 'confirm');
  const cancelToken = generateActionToken(visitId, 'cancel');
  const rescheduleToken = generateActionToken(visitId, 'reschedule');

  const confirmUrl = `${baseUrl}/api/appointment-actions?token=${confirmToken}`;
  const cancelUrl = `${baseUrl}/api/appointment-actions?token=${cancelToken}`;

  // Reschedule: if clinic phone is set, use tel: link; otherwise use the API endpoint
  const rescheduleUrl = clinicPhone
    ? `tel:${clinicPhone.replace(/\s/g, '')}`
    : `${baseUrl}/api/appointment-actions?token=${rescheduleToken}`;

  return `
    <div style="margin: 30px 0; text-align: center;">
      <p style="font-weight: bold; margin-bottom: 20px; color: #333;">Zarządzaj swoją wizytą:</p>
      <div style="margin-bottom: 12px;">
        <a href="${confirmUrl}" 
           style="display: inline-block; padding: 14px 32px; background-color: #4caf50; color: white; 
                  text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;
                  min-width: 200px;">
          ✅ Potwierdź wizytę
        </a>
      </div>
      <div style="margin-bottom: 12px;">
        <a href="${cancelUrl}" 
           style="display: inline-block; padding: 14px 32px; background-color: #f44336; color: white; 
                  text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;
                  min-width: 200px;">
          ❌ Anuluj wizytę
        </a>
      </div>
      <div>
        <a href="${rescheduleUrl}" 
           style="display: inline-block; padding: 14px 32px; background-color: #ff9800; color: white; 
                  text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;
                  min-width: 200px;">
          🔄 Zmień termin${clinicPhone ? ` (tel: ${clinicPhone})` : ''}
        </a>
      </div>
    </div>
  `;
}

const checkAndSendVisitReminders = async () => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const upcomingVisits = await prisma.visit.findMany({
      where: {
        status: { in: ['ZAPLANOWANA', 'POTWIERDZONA'] },
        data: { gt: now },
        OR: [
          { data: { lte: in7Days }, reminder7DaysSent: false },
          { data: { lte: in3Days }, reminder3DaysSent: false },
          { data: { lte: in1Day }, reminder1DaySent: false },
        ]
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            email: true,
            assignedDoctorId: true,
          },
        },
      }
    });

    for (const visit of upcomingVisits) {
      if (!visit.patient.email) continue;

      const timeDiff = visit.data.getTime() - now.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      let reminderType = '';
      let updateData: any = {};
      let includeActionButtons = false;

      if (daysDiff <= 1 && !visit.reminder1DaySent) {
        reminderType = '1 dzień';
        updateData = { reminder1DaySent: true, reminder3DaysSent: true, reminder7DaysSent: true };
        includeActionButtons = !visit.actionTokenSent; // Only include actions once
      } else if (daysDiff <= 3 && !visit.reminder3DaysSent) {
        reminderType = '3 dni';
        updateData = { reminder3DaysSent: true, reminder7DaysSent: true };
        includeActionButtons = !visit.actionTokenSent;
      } else if (daysDiff <= 7 && !visit.reminder7DaysSent) {
        reminderType = '7 dni';
        updateData = { reminder7DaysSent: true };
      } else {
        continue;
      }

      // Get assigned doctor's clinic phone for reschedule tel: link
      let clinicPhone: string | null = null;
      if (includeActionButtons && visit.patient.assignedDoctorId) {
        const doctor = await prisma.user.findUnique({
          where: { id: visit.patient.assignedDoctorId },
          select: { clinicPhone: true },
        });
        clinicPhone = doctor?.clinicPhone || null;
      }

      // Build action buttons HTML (only for reminders that should include them)
      const actionButtonsHTML = includeActionButtons
        ? buildActionButtonsHTML(visit.id, clinicPhone)
        : '';

      if (includeActionButtons) {
        updateData.actionTokenSent = true;
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
            
            ${actionButtonsHTML}
            
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

        // Log reminder event
        await prisma.visitEvent.create({
          data: {
            visitId: visit.id,
            eventType: 'REMINDER_SENT',
            createdBy: 'system',
            payload: {
              reminderType,
              includeActionButtons,
              recipientEmail: visit.patient.email,
            },
          },
        });

        console.log(`✅ Wysłano przypomnienie (${reminderType}) o wizycie do: ${visit.patient.email}${includeActionButtons ? ' [z przyciskami akcji]' : ''}`);
      } catch (e) {
        console.error('Błąd wysyłania automatycznego przypomnienia (wizyta):', e);
      }
    }

  } catch (error) {
    console.error('Błąd w checkAndSendVisitReminders:', error);
  }
};

export const startReminderWorker = () => {
  console.log('🔄 Reminder worker uruchomiony');

  // Check immediately
  checkAndSendReminders();
  checkAndSendVisitReminders();

  // Then check every 5 minutes
  setInterval(() => {
    checkAndSendReminders();
    checkAndSendVisitReminders();
  }, 5 * 60 * 1000);
};
