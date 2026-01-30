"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderWorker = void 0;
const emailService_1 = require("./emailService");
const pdfService_1 = require("./pdfService");
const logo_1 = require("../utils/logo");
const prisma_1 = require("../prisma");
const checkAndSendReminders = async () => {
    try {
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        // Find reminders that should be sent (within next 5 minutes)
        const reminders = await prisma_1.prisma.emailReminder.findMany({
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
                let attachments = [];
                switch (reminder.type) {
                    case 'CARE_PLAN_REMINDER':
                        if (reminder.carePlan) {
                            emailHtml = `
                ${(0, logo_1.getLogoHTML)()}
                <h2>Przypomnienie o planie opieki</h2>
                <p>Dzień dobry ${reminder.patient.firstName},</p>
                <p>Przypominamy o kontynuowaniu planu opieki trychologicznej: <strong>${reminder.carePlan.title}</strong></p>
                <p>W załączeniu znajdziesz aktualny plan opieki.</p>
                <p>Pozdrawiamy,<br>Zespół kliniki</p>
              `;
                            const pdfBuffer = await (0, pdfService_1.generateCarePlanPDF)(reminder.carePlan);
                            attachments.push({
                                filename: `plan-opieki-${reminder.carePlan.id}.pdf`,
                                content: pdfBuffer,
                            });
                        }
                        else {
                            emailHtml = reminder.bodyPreview || reminder.subject;
                        }
                        break;
                    case 'FOLLOW_UP_VISIT':
                        emailHtml = `
              ${(0, logo_1.getLogoHTML)()}
              <h2>Przypomnienie o wizycie kontrolnej</h2>
              <p>Dzień dobry ${reminder.patient.firstName},</p>
              <p>Przypominamy o zaplanowanej wizycie kontrolnej.</p>
              ${reminder.bodyPreview ? `<p>${reminder.bodyPreview}</p>` : ''}
              <p>Pozdrawiamy,<br>Zespół kliniki</p>
            `;
                        break;
                    case 'LAB_RESULTS_REMINDER':
                        emailHtml = `
              ${(0, logo_1.getLogoHTML)()}
              <h2>Przypomnienie o wynikach badań</h2>
              <p>Dzień dobry ${reminder.patient.firstName},</p>
              <p>Przypominamy o konieczności wykonania badań laboratoryjnych.</p>
              ${reminder.bodyPreview ? `<p>${reminder.bodyPreview}</p>` : ''}
              <p>Pozdrawiamy,<br>Zespół kliniki</p>
            `;
                        break;
                }
                if (reminder.patient.email) {
                    await (0, emailService_1.sendEmail)({
                        to: reminder.patient.email,
                        subject: reminder.subject,
                        html: emailHtml,
                        attachments,
                    });
                    await prisma_1.prisma.emailReminder.update({
                        where: { id: reminder.id },
                        data: { status: 'SENT' },
                    });
                    console.log(`Przypomnienie wysłane: ${reminder.id}`);
                }
                else {
                    await prisma_1.prisma.emailReminder.update({
                        where: { id: reminder.id },
                        data: { status: 'FAILED' },
                    });
                    console.log(`Przypomnienie nie wysłane - brak email pacjenta: ${reminder.id}`);
                }
            }
            catch (error) {
                console.error(`Błąd wysyłania przypomnienia ${reminder.id}:`, error);
                await prisma_1.prisma.emailReminder.update({
                    where: { id: reminder.id },
                    data: { status: 'FAILED' },
                });
            }
        }
    }
    catch (error) {
        console.error('Błąd w reminder worker:', error);
    }
};
const startReminderWorker = () => {
    console.log('🔄 Reminder worker uruchomiony');
    // Check immediately
    checkAndSendReminders();
    // Then check every 5 minutes
    setInterval(() => {
        checkAndSendReminders();
    }, 5 * 60 * 1000);
};
exports.startReminderWorker = startReminderWorker;
//# sourceMappingURL=reminderWorker.js.map