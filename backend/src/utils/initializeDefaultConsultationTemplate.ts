import { prisma as defaultPrisma } from '../prisma';
import { generateDefaultFields } from '../scripts/seedDefaultConsultationTemplate';

export async function initializeDefaultConsultationTemplate(prisma = defaultPrisma) {
  const db = prisma;

  try {
    const doctors = await db.user.findMany({
      where: { role: 'DOCTOR' },
      select: { id: true, name: true, email: true },
    });

    if (doctors.length === 0) {
      console.log('⚠️ Brak lekarzy - pomijam inicjalizację szablonu konsultacji');
      return;
    }

    const defaultFields = generateDefaultFields() as any;

    for (const doctor of doctors) {
      const existing = await db.consultationTemplate.findFirst({
        where: {
          doctorId: doctor.id,
          isDefault: true,
        },
      });

      if (existing) {
        if (existing.name === 'Standardowy arkusz konsultacji') {
          await db.consultationTemplate.update({
            where: { id: existing.id },
            data: {
              name: 'Karta konsultacyjna (PDF)',
              fields: defaultFields,
            },
          });
          console.log(`✅ Zaktualizowano domyślny szablon konsultacji dla ${doctor.email}`);
        }
      } else {
        await db.consultationTemplate.create({
          data: {
            name: 'Karta konsultacyjna (PDF)',
            doctorId: doctor.id,
            fields: defaultFields,
            isDefault: true,
            isActive: true,
          },
        });
        console.log(`✅ Utworzono domyślny szablon konsultacji dla ${doctor.email}`);
      }
    }
  } catch (error) {
    console.error('❌ Błąd podczas inicjalizacji szablonu konsultacji:', error);
  }
}
