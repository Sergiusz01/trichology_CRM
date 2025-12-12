import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password';
import { initializeDefaultTemplates } from '../utils/initializeDefaultTemplates';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Rozpoczynam seedowanie bazy danych...');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Utworzono użytkownika admin:', admin.email);

  // Create doctor user
  const doctorPassword = await hashPassword('doctor123');
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@example.com' },
    update: {},
    create: {
      name: 'Dr. Anna Kowalska',
      email: 'doctor@example.com',
      passwordHash: doctorPassword,
      role: 'DOCTOR',
    },
  });
  console.log('✅ Utworzono użytkownika lekarza:', doctor.email);

  // Create sample patient
  const patient = await prisma.patient.upsert({
    where: { id: 'sample-patient-1' },
    update: {},
    create: {
      id: 'sample-patient-1',
      firstName: 'Jan',
      lastName: 'Nowak',
      age: 35,
      gender: 'MALE',
      phone: '+48 123 456 789',
      email: 'jan.nowak@example.com',
      occupation: 'Inżynier',
      address: 'ul. Przykładowa 1, 00-001 Warszawa',
    },
  });
  console.log('✅ Utworzono pacjenta:', `${patient.firstName} ${patient.lastName}`);

  // Create sample consultation
  const consultation = await prisma.consultation.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      consultationDate: new Date(),
      hairLossSeverity: 'Umiarkowane',
      hairLossLocalization: 'Czubek głowy, linia włosów',
      hairLossDuration: '6 miesięcy',
      scalingSeverity: 'Łagodne',
      scalingType: 'Drobne łuski',
      diagnosis: 'Łysienie androgenowe typu męskiego (AGA)',
      careRecommendationsWashing: 'Szampon z ketokonazolem 2x w tygodniu',
      careRecommendationsTopical: 'Minoksydyl 5% wieczorem',
      careRecommendationsSupplement: 'Biotyna, cynk, żelazo',
      generalRemarks: 'Pacjent wymaga regularnych kontroli co 3 miesiące.',
    },
  });
  console.log('✅ Utworzono konsultację:', consultation.id);

  // Create sample lab result
  const labResult = await prisma.labResult.create({
    data: {
      patientId: patient.id,
      consultationId: consultation.id,
      date: new Date(),
      ferritin: 45,
      ferritinUnit: 'ng/mL',
      ferritinRefLow: 15,
      ferritinRefHigh: 150,
      ferritinFlag: 'NORMAL',
      vitaminD3: 18,
      vitaminD3Unit: 'ng/mL',
      vitaminD3RefLow: 30,
      vitaminD3RefHigh: 100,
      vitaminD3Flag: 'LOW',
      tsh: 2.5,
      tshUnit: 'mIU/L',
      tshRefLow: 0.4,
      tshRefHigh: 4.0,
      tshFlag: 'NORMAL',
      notes: 'Niski poziom witaminy D3 - wymaga suplementacji.',
    },
  });
  console.log('✅ Utworzono wynik laboratoryjny:', labResult.id);

  // Create sample care plan
  const carePlan = await prisma.carePlan.create({
    data: {
      patientId: patient.id,
      consultationId: consultation.id,
      createdByUserId: doctor.id,
      title: '8-tygodniowy plan odbudowy włosów',
      totalDurationWeeks: 8,
      notes: 'Plan indywidualnie dostosowany do potrzeb pacjenta. Wymagana regularność stosowania.',
      isActive: true,
      weeks: {
        create: [
          {
            weekNumber: 1,
            description: 'Rozpoczęcie terapii',
            washingRoutine: 'Mycie 3x w tygodniu szamponem z ketokonazolem',
            topicalProducts: 'Minoksydyl 5% - 1ml wieczorem na skórę głowy',
            supplements: 'Biotyna 5000mcg, Cynk 15mg, Witamina D3 2000IU - codziennie',
            remarks: 'Możliwe lekkie podrażnienie skóry głowy na początku',
          },
          {
            weekNumber: 2,
            description: 'Kontynuacja',
            washingRoutine: 'Mycie 3x w tygodniu',
            topicalProducts: 'Minoksydyl 5% - 1ml wieczorem',
            supplements: 'Biotyna 5000mcg, Cynk 15mg, Witamina D3 2000IU',
            remarks: 'Obserwacja reakcji skóry',
          },
          {
            weekNumber: 3,
            description: 'Kontynuacja',
            washingRoutine: 'Mycie 3x w tygodniu',
            topicalProducts: 'Minoksydyl 5% - 1ml wieczorem',
            supplements: 'Biotyna 5000mcg, Cynk 15mg, Witamina D3 2000IU',
          },
          {
            weekNumber: 4,
            description: 'Wizyta kontrolna',
            washingRoutine: 'Mycie 3x w tygodniu',
            topicalProducts: 'Minoksydyl 5% - 1ml wieczorem',
            supplements: 'Biotyna 5000mcg, Cynk 15mg, Witamina D3 2000IU',
            inClinicProcedures: 'Wizyta kontrolna - ocena postępów',
          },
        ],
      },
    },
  });
  console.log('✅ Utworzono plan opieki:', carePlan.id);

  // Initialize default email templates
  await initializeDefaultTemplates(admin.id, prisma);

  console.log('\n🎉 Seedowanie zakończone pomyślnie!');
  console.log('\nDane logowania:');
  console.log('Admin: admin@example.com / admin123');
  console.log('Lekarz: doctor@example.com / doctor123');
}

main()
  .catch((e) => {
    console.error('❌ Błąd podczas seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


