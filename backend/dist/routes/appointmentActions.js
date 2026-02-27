"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const appointmentToken_1 = require("../utils/appointmentToken");
const prisma_1 = require("../prisma");
const emailService_1 = require("../services/emailService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ACTION_LABELS = {
    confirm: 'potwierdzono',
    cancel: 'anulowano',
    reschedule: 'zgłoszono prośbę o zmianę terminu',
};
const ACTION_COLORS = {
    confirm: '#34C759',
    cancel: '#FF3B30',
    reschedule: '#FF9500',
};
const ACTION_TITLES = {
    confirm: 'Wizyta potwierdzona',
    cancel: 'Wizyta anulowana',
    reschedule: 'Prośba o zmianę terminu wysłana',
};
const STATUS_MAP = {
    confirm: 'POTWIERDZONA',
    cancel: 'ANULOWANA',
    reschedule: 'PROSBA_ZMIANY',
};
const buildResultPage = (title, message, color, isError = false) => `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f5f5f7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
    }
    .icon {
      font-size: 56px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #1d1d1f;
      margin-bottom: 12px;
    }
    .message {
      font-size: 15px;
      color: #6e6e73;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      background: ${color}22;
      color: ${color};
      border-radius: 8px;
      padding: 6px 16px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isError ? '⚠️' : (color === '#34C759' ? '✅' : color === '#FF3B30' ? '❌' : '🔄')}</div>
    <div class="title">${escapeHtml(title)}</div>
    <div class="message">${escapeHtml(message)}</div>
    <div class="badge">${escapeHtml(title)}</div>
    <div class="footer">Trichologia CRM · Wiadomość wygenerowana automatycznie</div>
  </div>
</body>
</html>
`;
/**
 * GET /api/appointment-actions?token=...
 * Public endpoint — no authentication required.
 * Validates token, updates visit status, logs event, creates notification.
 */
router.get('/', async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
        return res.status(400).send(buildResultPage('Nieprawidłowy link', 'Link jest nieprawidłowy lub niekompletny. Sprawdź treść wiadomości email.', '#FF3B30', true));
    }
    let payload;
    try {
        payload = (0, appointmentToken_1.verifyActionToken)(token);
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(410).send(buildResultPage('Link wygasł', 'Ten link działał przez 48 godzin i już wygasł. Skontaktuj się z kliniką, jeśli chcesz zmienić status wizyty.', '#FF9500', true));
        }
        return res.status(400).send(buildResultPage('Nieprawidłowy link', 'Link jest nieprawidłowy lub został zmodyfikowany. Sprawdź treść wiadomości email.', '#FF3B30', true));
    }
    const { visitId, action } = payload;
    try {
        const visit = await prisma_1.prisma.visit.findUnique({
            where: { id: visitId },
            include: {
                patient: { select: { firstName: true, lastName: true, email: true } },
            },
        });
        if (!visit) {
            return res.status(404).send(buildResultPage('Wizyta nie znaleziona', 'Nie znaleziono wizyty powiązanej z tym linkiem.', '#FF3B30', true));
        }
        const newStatus = STATUS_MAP[action];
        const patientFullName = `${visit.patient.firstName} ${visit.patient.lastName}`;
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
        // Idempotency: if visit already has this status, return success without re-updating
        if (visit.status === newStatus) {
            const title = ACTION_TITLES[action];
            const color = ACTION_COLORS[action];
            return res.send(buildResultPage(title, `Akcja "${ACTION_LABELS[action]}" dla wizyty ${visitDateFormatted} jest już zarejestrowana.`, color));
        }
        // Only allow transitions from ZAPLANOWANA (or POTWIERDZONA for cancel/reschedule)
        const allowedSourceStatuses = ['ZAPLANOWANA', 'POTWIERDZONA'];
        if (!allowedSourceStatuses.includes(visit.status)) {
            return res.send(buildResultPage('Akcja niedostępna', `Status tej wizyty wynosi "${visit.status}" i nie można już zmieniać jej statusu przez link email.`, '#FF9500', true));
        }
        // Update visit status
        await prisma_1.prisma.visit.update({
            where: { id: visitId },
            data: { status: newStatus },
        });
        // Log event
        await prisma_1.prisma.visitEvent.create({
            data: {
                visitId,
                eventType: action,
                payload: {
                    previousStatus: visit.status,
                    newStatus,
                    patientName: patientFullName,
                    visitDate: visitDate.toISOString(),
                },
                createdBy: 'patient_link',
            },
        });
        // Create dashboard notification
        await prisma_1.prisma.dashboardNotification.create({
            data: {
                visitId,
                patientName: patientFullName,
                visitDate: visitDate,
                actionType: action,
                isRead: false,
            },
        });
        // Log notification
        await prisma_1.prisma.notificationLog.create({
            data: {
                visitId,
                type: `patient_${action}`,
                recipient: 'clinic',
                status: 'created',
            },
        });
        // Send email notification to specialist
        await sendSpecialistNotification(visit, action, patientFullName, visitDateFormatted);
        const title = ACTION_TITLES[action];
        const color = ACTION_COLORS[action];
        let message = '';
        if (action === 'confirm') {
            message = `Dziękujemy! Twoja wizyta "${visit.rodzajZabiegu}" w dniu ${visitDateFormatted} została potwierdzona. Do zobaczenia!`;
        }
        else if (action === 'cancel') {
            message = `Wizyta "${visit.rodzajZabiegu}" w dniu ${visitDateFormatted} została anulowana. Jeśli chcesz umówić nową wizytę, skontaktuj się z kliniką.`;
        }
        else {
            message = `Prośba o zmianę terminu wizyty "${visit.rodzajZabiegu}" (${visitDateFormatted}) została przekazana do kliniki. Skontaktujemy się z Tobą wkrótce.`;
        }
        return res.send(buildResultPage(title, message, color));
    }
    catch (err) {
        console.error('[appointmentActions] Błąd:', err);
        return res.status(500).send(buildResultPage('Błąd serwera', 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub skontaktuj się z kliniką.', '#FF3B30', true));
    }
});
async function sendSpecialistNotification(visit, action, patientFullName, visitDateFormatted) {
    // Find all specialists (ADMIN and DOCTOR) to notify
    // In a more refined setup you'd target the specific assigned specialist
    const specialists = await prisma_1.prisma.user.findMany({
        where: { isActive: true, role: { in: ['ADMIN', 'DOCTOR'] } },
        include: { specialistSettings: true },
        take: 5,
    });
    if (specialists.length === 0)
        return;
    const actionLabel = ACTION_LABELS[action];
    const clinicPhone = specialists[0]?.specialistSettings?.clinicPhone;
    const subjectMap = {
        confirm: `✅ Pacjent potwierdził wizytę — ${patientFullName}`,
        cancel: `❌ Pacjent anulował wizytę — ${patientFullName}`,
        reschedule: `🔄 Prośba o zmianę terminu — ${patientFullName}`,
    };
    const subject = subjectMap[action] || `Akcja pacjenta: ${actionLabel}`;
    const rescheduleNote = action === 'reschedule'
        ? `<p style="background:#fff3cd;padding:14px;border-radius:6px;border-left:4px solid #ffc107;margin:20px 0;">
        <strong>Pacjent prosi o zmianę terminu.</strong><br>
        Skontaktuj się z pacjentem, aby ustalić nowy termin.
        ${clinicPhone ? `Pacjent może zadzwonić pod numer: <strong><a href="tel:${clinicPhone}">${clinicPhone}</a></strong>` : ''}
      </p>`
        : '';
    const html = `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
.wrap{max-width:560px;margin:0 auto;padding:20px}
.header{background:#1976d2;color:white;padding:18px 24px;border-radius:8px 8px 0 0}
.body{background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px}
.info{background:white;padding:16px;border-radius:6px;border-left:4px solid #1976d2;margin:16px 0}
</style></head>
<body>
<div class="wrap">
  <div class="header"><h2 style="margin:0">Powiadomienie o wizycie</h2></div>
  <div class="body">
    <p>Pacjent <strong>${escapeHtml(patientFullName)}</strong> ${escapeHtml(actionLabel)} wizytę.</p>
    <div class="info">
      <p><strong>Pacjent:</strong> ${escapeHtml(patientFullName)}</p>
      <p><strong>Zabieg:</strong> ${escapeHtml(visit.rodzajZabiegu)}</p>
      <p><strong>Data wizyty:</strong> ${escapeHtml(visitDateFormatted)}</p>
      <p><strong>Akcja:</strong> ${escapeHtml(actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1))}</p>
    </div>
    ${rescheduleNote}
    <p style="color:#888;font-size:12px;margin-top:24px">Wiadomość wygenerowana automatycznie przez system CRM.</p>
  </div>
</div>
</body></html>`;
    for (const specialist of specialists) {
        try {
            await (0, emailService_1.sendEmail)({ to: specialist.email, subject, html });
        }
        catch (e) {
            console.error(`[appointmentActions] Błąd wysyłania emaila do specjalisty ${specialist.email}:`, e);
        }
    }
}
exports.default = router;
//# sourceMappingURL=appointmentActions.js.map