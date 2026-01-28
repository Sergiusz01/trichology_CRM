const { prisma } = require('../dist/prisma');

async function checkTemplates() {
  try {
    const templates = await prisma.consultationTemplate.findMany();
    console.log('Znaleziono szablonów:', templates.length);
    templates.forEach(t => {
      console.log(`- ${t.name} (ID: ${t.id}, isDefault: ${t.isDefault}, doctorId: ${t.doctorId}, fields: ${Array.isArray(t.fields) ? t.fields.length : 0})`);
    });
    
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    });
    console.log('\nUżytkownicy:');
    users.forEach(u => {
      console.log(`- ${u.email} (ID: ${u.id}, role: ${u.role})`);
    });
    
    // Check if default template exists for any doctor
    const defaultTemplates = await prisma.consultationTemplate.findMany({
      where: { isDefault: true }
    });
    console.log('\nDomyślne szablony:', defaultTemplates.length);
    defaultTemplates.forEach(t => {
      console.log(`- ${t.name} (doctorId: ${t.doctorId})`);
    });
  } catch (e) {
    console.error('Błąd:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();
