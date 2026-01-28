import { prisma } from '../prisma';
import { hashPassword } from '../utils/password';

async function updateTestUser() {
  try {
    console.log('🔄 Aktualizowanie użytkownika testowego...');

    // Find existing doctor user
    const existingDoctor = await prisma.user.findFirst({
      where: {
        role: 'DOCTOR',
        OR: [
          { email: 'doctor@example.com' },
          { email: 'agnieszka.polanska@example.com' },
        ],
      },
    });

    if (existingDoctor) {
      console.log(`Znaleziono użytkownika: ${existingDoctor.name} (${existingDoctor.email})`);
      
      const newPassword = await hashPassword('test123');
      
      // Update to Agnieszka Polańska
      const updated = await prisma.user.update({
        where: { id: existingDoctor.id },
        data: {
          name: 'Agnieszka Polańska',
          email: 'agnieszka.polanska@example.com',
          passwordHash: newPassword,
        },
      });
      
      console.log(`✅ Zaktualizowano użytkownika na: ${updated.name} (${updated.email})`);
      
      // Update consultation template for this user
      const template = await prisma.consultationTemplate.findFirst({
        where: {
          doctorId: updated.id,
          isDefault: true,
        },
      });
      
      if (template) {
        console.log(`✅ Szablon konsultacji już istnieje dla ${updated.name}`);
      } else {
        // Create template if doesn't exist
        const { generateDefaultFields } = await import('./seedDefaultConsultationTemplate');
        await prisma.consultationTemplate.create({
          data: {
            name: 'Standardowy arkusz konsultacji',
            doctorId: updated.id,
            fields: generateDefaultFields() as any,
            isDefault: true,
            isActive: true,
          },
        });
        console.log(`✅ Utworzono szablon konsultacji dla ${updated.name}`);
      }
    } else {
      // Create new user if doesn't exist
      const newPassword = await hashPassword('test123');
      const newUser = await prisma.user.create({
        data: {
          name: 'Agnieszka Polańska',
          email: 'agnieszka.polanska@example.com',
          passwordHash: newPassword,
          role: 'DOCTOR',
        },
      });
      console.log(`✅ Utworzono nowego użytkownika: ${newUser.name} (${newUser.email})`);
      
      // Create template
      const { generateDefaultFields } = await import('./seedDefaultConsultationTemplate');
      await prisma.consultationTemplate.create({
        data: {
          name: 'Standardowy arkusz konsultacji',
          doctorId: newUser.id,
          fields: generateDefaultFields() as any,
          isDefault: true,
          isActive: true,
        },
      });
      console.log(`✅ Utworzono szablon konsultacji dla ${newUser.name}`);
    }

    console.log('\n✅ Aktualizacja zakończona pomyślnie!');
    console.log('Dane logowania:');
    console.log('Email: agnieszka.polanska@example.com');
    console.log('Hasło: test123');
  } catch (error) {
    console.error('❌ Błąd aktualizacji:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  updateTestUser()
    .then(() => {
      console.log('✓ Skrypt zakończony');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Błąd:', error);
      process.exit(1);
    });
}

export { updateTestUser };
