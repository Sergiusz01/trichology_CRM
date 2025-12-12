import { PrismaClient } from '@prisma/client';
import { initializeDefaultTemplates } from '../utils/initializeDefaultTemplates';

const prisma = new PrismaClient();

async function main() {
  console.log('📧 Inicjalizacja domyślnych szablonów emaili...');

  // Get first admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    console.error('❌ Nie znaleziono użytkownika ADMIN');
    process.exit(1);
  }

  await initializeDefaultTemplates(admin.id, prisma);
  console.log('✅ Domyślne szablony zostały zainicjalizowane');
}

main()
  .catch((e) => {
    console.error('❌ Błąd podczas inicjalizacji szablonów:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

