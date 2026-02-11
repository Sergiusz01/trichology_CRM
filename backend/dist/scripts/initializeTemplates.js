"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const initializeDefaultTemplates_1 = require("../utils/initializeDefaultTemplates");
const prisma_1 = require("../prisma");
async function main() {
    console.log('📧 Inicjalizacja domyślnych szablonów emaili...');
    // Get first admin user
    const admin = await prisma_1.prisma.user.findFirst({
        where: { role: 'ADMIN' },
    });
    if (!admin) {
        console.error('❌ Nie znaleziono użytkownika ADMIN');
        process.exit(1);
    }
    await (0, initializeDefaultTemplates_1.initializeDefaultTemplates)(admin.id, prisma_1.prisma);
    console.log('✅ Domyślne szablony zostały zainicjalizowane');
}
main()
    .catch((e) => {
    console.error('❌ Błąd podczas inicjalizacji szablonów:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
//# sourceMappingURL=initializeTemplates.js.map