/**
 * Public appointment action route — no auth required.
 *
 * Patients click links in reminder emails to confirm, cancel, or request
 * rescheduling. Each link carries a signed JWT token.
 *
 * GET /api/appointment-actions?token=<jwt>
 */
import express from 'express';
import { prisma } from '../prisma';
import { verifyActionToken, AppointmentAction } from '../services/appointmentTokenService';
import { sendEmail } from '../services/emailService';
import { getLogoHTML } from '../utils/logo';
import { VisitStatus } from '@prisma/client';

const router = express.Router();

/** Map action → target VisitStatus */
const ACTION_TO_STATUS: Record<AppointmentAction, VisitStatus> = {
    confirm: 'POTWIERDZONA',
    cancel: 'ANULOWANA',
    reschedule: 'ZMIANA_TERMINU',
};

/** Statuses from which a patient action is allowed */
const ACTIONABLE_STATUSES: VisitStatus[] = ['ZAPLANOWANA', 'POTWIERDZONA'];

/** Polish labels */
const ACTION_LABELS: Record<AppointmentAction, string> = {
    confirm: 'Potwierdzenie wizyty',
    cancel: 'Anulowanie wizyty',
    reschedule: 'Prośba o zmianę terminu',
};

const EVENT_TYPES: Record<AppointmentAction, string> = {
    confirm: 'CONFIRMED',
    cancel: 'CANCELED',
    reschedule: 'RESCHEDULE_REQUESTED',
};

/** Generate a minimal HTML response page */
function renderResultPage(title: string, message: string, success: boolean): string {
    const color = success ? '#4caf50' : '#f44336';
    const icon = success ? '✅' : '❌';
    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           display: flex; justify-content: center; align-items: center; min-height: 100vh;
           background: #f5f5f5; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 480px;
            width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.1); text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #333; margin-bottom: 12px; }
    p { color: #666; line-height: 1.6; font-size: 15px; }
    .status { display: inline-block; padding: 6px 16px; border-radius: 20px;
              background: ${color}22; color: ${color}; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

router.get('/', async (req, res) => {
    const token = req.query.token as string | undefined;

    if (!token) {
        return res.status(400).send(renderResultPage(
            'Brak tokenu',
            'Link jest nieprawidłowy. Sprawdź, czy skopiowałeś pełny adres z emaila.',
            false,
        ));
    }

    try {
        // 1. Verify token
        const { visitId, action } = verifyActionToken(token);

        // 2. Find visit
        const visit = await prisma.visit.findUnique({
            where: { id: visitId },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
        });

        if (!visit) {
            return res.status(404).send(renderResultPage(
                'Wizyta nie znaleziona',
                'Ta wizyta nie istnieje w naszym systemie.',
                false,
            ));
        }

        const targetStatus = ACTION_TO_STATUS[action];

        // 3. Idempotent check — already in target status
        if (visit.status === targetStatus) {
            return res.send(renderResultPage(
                ACTION_LABELS[action],
                `Ta akcja została już zarejestrowana. Status wizyty: ${targetStatus}.`,
                true,
            ));
        }

        // 4. Check if transition is allowed
        if (!ACTIONABLE_STATUSES.includes(visit.status)) {
            return res.status(409).send(renderResultPage(
                'Akcja niemożliwa',
                `Status wizyty (${visit.status}) nie pozwala na tę operację. Możliwe, że wizyta została już anulowana lub odbyła się.`,
                false,
            ));
        }

        // 5. Update status
        await prisma.visit.update({
            where: { id: visitId },
            data: { status: targetStatus },
        });

        // 6. Log event
        const visitDate = visit.data instanceof Date ? visit.data : new Date(visit.data);
        await prisma.visitEvent.create({
            data: {
                visitId,
                eventType: EVENT_TYPES[action],
                createdBy: 'patient_link',
                payload: {
                    patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
                    visitDate: visitDate.toISOString(),
                    action,
                    previousStatus: visit.status,
                    newStatus: targetStatus,
                },
            },
        });

        // 7. Notify specialist (assigned doctor) via email
        try {
            // Find the assigned doctor for this patient
            const patient = await prisma.patient.findUnique({
                where: { id: visit.patientId },
                select: { assignedDoctorId: true },
            });

            if (patient?.assignedDoctorId) {
                const doctor = await prisma.user.findUnique({
                    where: { id: patient.assignedDoctorId },
                    select: { email: true, name: true },
                });

                if (doctor?.email) {
                    const formattedDate = visitDate.toLocaleDateString('pl-PL', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
                    });

                    const actionColor = action === 'confirm' ? '#4caf50' : action === 'cancel' ? '#f44336' : '#ff9800';
                    const actionIcon = action === 'confirm' ? '✅' : action === 'cancel' ? '❌' : '🔄';

                    const emailHtml = `
          <!DOCTYPE html>
          <html><head><meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${actionColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .info { background: white; padding: 16px; border-radius: 5px; border-left: 4px solid ${actionColor}; margin: 16px 0; }
          </style>
          </head><body>
          <div class="container">
            ${getLogoHTML()}
            <div class="header">
              <h1>${actionIcon} ${ACTION_LABELS[action]}</h1>
            </div>
            <div class="content">
              <p>Dzień dobry ${doctor.name},</p>
              <p>Pacjent <strong>${visit.patient.firstName} ${visit.patient.lastName}</strong> wykonał akcję dotyczącą wizyty:</p>
              <div class="info">
                <p><strong>Akcja:</strong> ${ACTION_LABELS[action]}</p>
                <p><strong>Zabieg:</strong> ${visit.rodzajZabiegu}</p>
                <p><strong>Data wizyty:</strong> ${formattedDate}</p>
                <p><strong>Nowy status:</strong> ${targetStatus}</p>
                ${visit.patient.phone ? `<p><strong>Telefon pacjenta:</strong> ${visit.patient.phone}</p>` : ''}
                ${visit.patient.email ? `<p><strong>Email pacjenta:</strong> ${visit.patient.email}</p>` : ''}
              </div>
              ${action === 'reschedule' ? '<p style="background:#fff3cd;padding:12px;border-radius:5px;border-left:4px solid #ffc107"><strong>⚠️ Pacjent prosi o zmianę terminu.</strong> Skontaktuj się z pacjentem, aby ustalić nowy termin.</p>' : ''}
              <p style="color:#666;font-size:12px;margin-top:20px">Wiadomość wygenerowana automatycznie.</p>
            </div>
          </div>
          </body></html>`;

                    await sendEmail({
                        to: doctor.email,
                        subject: `${actionIcon} ${ACTION_LABELS[action]} — ${visit.patient.firstName} ${visit.patient.lastName}`,
                        html: emailHtml,
                    });
                }
            }
        } catch (emailError) {
            console.error('Błąd wysyłania powiadomienia do lekarza:', emailError);
            // Don't fail the patient action because of email error
        }

        // 8. Return success page
        let successMessage = '';
        switch (action) {
            case 'confirm':
                successMessage = 'Twoja wizyta została potwierdzona. Dziękujemy!';
                break;
            case 'cancel':
                successMessage = 'Twoja wizyta została anulowana. Jeśli chcesz umówić nowy termin, skontaktuj się z kliniką.';
                break;
            case 'reschedule':
                successMessage = 'Twoja prośba o zmianę terminu została zarejestrowana. Klinika skontaktuje się z Tobą w celu ustalenia nowego terminu.';
                break;
        }

        return res.send(renderResultPage(ACTION_LABELS[action], successMessage, true));
    } catch (error: any) {
        console.error('Appointment action error:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(410).send(renderResultPage(
                'Link wygasł',
                'Ten link już wygasł. Skontaktuj się z kliniką telefonicznie lub emailem.',
                false,
            ));
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send(renderResultPage(
                'Nieprawidłowy link',
                'Ten link jest nieprawidłowy. Sprawdź, czy skopiowałeś pełny adres z emaila.',
                false,
            ));
        }

        return res.status(500).send(renderResultPage(
            'Błąd serwera',
            'Wystąpił niespodziewany błąd. Spróbuj ponownie później lub skontaktuj się z kliniką.',
            false,
        ));
    }
});

export default router;
