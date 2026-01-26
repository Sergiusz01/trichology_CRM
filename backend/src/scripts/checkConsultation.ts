import { prisma } from '../prisma';

async function checkConsultation() {
  const consultationId = process.argv[2];

  if (!consultationId) {
    console.log('Użycie: npm run check-consultation <id-konsultacji>');
    process.exit(1);
  }

  console.log(`🔍 Sprawdzanie konsultacji o ID: ${consultationId}\n`);

  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (consultation) {
      console.log('✅ Konsultacja znaleziona:');
      console.log(`  ID: ${consultation.id}`);
      console.log(`  Data: ${new Date(consultation.consultationDate).toLocaleString('pl-PL')}`);
      console.log(`  Pacjent: ${consultation.patient.firstName} ${consultation.patient.lastName} (${consultation.patient.id})`);
      console.log(`  Lekarz: ${consultation.doctor.name} (${consultation.doctor.id})`);
    } else {
      console.log('❌ Konsultacja NIE została znaleziona w bazie danych.');
      
      // Check total consultations
      const total = await prisma.consultation.count();
      console.log(`\n📊 Liczba konsultacji w bazie: ${total}`);
      
      if (total > 0) {
        const recent = await prisma.consultation.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, consultationDate: true, patientId: true },
        });
        console.log('\n📋 Ostatnie 5 konsultacji:');
        recent.forEach((c) => {
          console.log(`  - ${c.id} (${new Date(c.consultationDate).toLocaleDateString('pl-PL')})`);
        });
      }
    }
  } catch (error: any) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkConsultation();

