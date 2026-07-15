import { prisma as defaultPrisma } from '../prisma';
import { logger } from './logger';

/**
 * Initialize default email templates if they don't exist
 * This function ensures that default templates are always available in the database
 */
export async function initializeDefaultTemplates(adminUserId: string, prisma = defaultPrisma) {
  const db = prisma;
  
  try {
    // Check if default templates already exist
    const existingDefaults = await db.emailTemplate.findMany({
      where: {
        isDefault: true,
      },
    });
    
    if (existingDefaults.length >= 4) {
      logger.info('Domyślne szablony emaili już istnieją, pomijam inicjalizację');
      return;
    }

    logger.info('Inicjalizacja domyślnych szablonów emaili...');

    // Consultation template
    await db.emailTemplate.upsert({
      where: { id: 'default-consultation-template' },
      update: {},
      create: {
        id: 'default-consultation-template',
        name: 'Konsultacja - Domyślny',
        type: 'CONSULTATION',
        subject: 'Konsultacja trychologiczna - {{patientName}}',
        htmlBody: `
          <h2>Konsultacja trychologiczna</h2>
          <p>Dzień dobry,</p>
          <p>W załączeniu przesyłamy szczegóły konsultacji z dnia {{consultationDate}}.</p>
          <p><strong>Pacjent:</strong> {{patientName}}</p>
          <p><strong>Lekarz:</strong> {{doctorName}}</p>
          <p>Pozdrawiamy,<br>Zespół kliniki</p>
        `,
        isDefault: true,
        isActive: true,
        createdByUserId: adminUserId,
      },
    });

    // Care Plan template
    await db.emailTemplate.upsert({
      where: { id: 'default-care-plan-template' },
      update: {},
      create: {
        id: 'default-care-plan-template',
        name: 'Plan opieki - Domyślny',
        type: 'CARE_PLAN',
        subject: 'Plan opieki trychologicznej - {{patientName}}',
        htmlBody: `
          <h2>Plan opieki trychologicznej</h2>
          <p>Dzień dobry,</p>
          <p>W załączeniu przesyłamy Twój indywidualny plan opieki trychologicznej: <strong>{{carePlanTitle}}</strong> ({{carePlanDuration}}).</p>
          <p><strong>Pacjent:</strong> {{patientName}}</p>
          <p><strong>Lekarz:</strong> {{doctorName}}</p>
          <p>Pozdrawiamy,<br>Zespół kliniki</p>
        `,
        isDefault: true,
        isActive: true,
        createdByUserId: adminUserId,
      },
    });

    // Lab Result template
    await db.emailTemplate.upsert({
      where: { id: 'default-lab-result-template' },
      update: {},
      create: {
        id: 'default-lab-result-template',
        name: 'Wynik badania - Domyślny',
        type: 'LAB_RESULT',
        subject: 'Wyniki badań laboratoryjnych - {{patientName}}',
        htmlBody: `
          <h2>Wyniki badań laboratoryjnych</h2>
          <p>Dzień dobry {{patientFirstName}},</p>
          <p>W załączeniu przesyłamy wyniki badań laboratoryjnych z dnia {{labResultDate}}.</p>
          <p><strong>Pacjent:</strong> {{patientName}}</p>
          <p>Pozdrawiamy,<br>Zespół kliniki</p>
        `,
        isDefault: true,
        isActive: true,
        createdByUserId: adminUserId,
      },
    });

    // Custom template (for general messages)
    await db.emailTemplate.upsert({
      where: { id: 'default-custom-template' },
      update: {},
      create: {
        id: 'default-custom-template',
        name: 'Wiadomość niestandardowa - Domyślny',
        type: 'CUSTOM',
        subject: '{{subject}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>{{subject}}</h2>
            <p>Dzień dobry {{patientFirstName}} {{patientLastName}},</p>
            <div style="white-space: pre-wrap;">{{message}}</div>
            <p style="margin-top: 20px;">Z poważaniem,<br><strong>{{doctorName}}</strong></p>
          </div>
        `,
        isDefault: true,
        isActive: true,
        createdByUserId: adminUserId,
      },
    });

    logger.info('Domyślne szablony emaili zostały zainicjalizowane');
  } catch (error) {
    logger.error('Błąd podczas inicjalizacji domyślnych szablonów emaili', { error });
    throw error;
  }
}

