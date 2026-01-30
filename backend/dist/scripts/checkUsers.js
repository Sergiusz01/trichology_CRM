"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const password_1 = require("../utils/password");
const prisma_1 = require("../prisma");
async function main() {
    console.log('🔍 Sprawdzanie użytkowników w bazie danych...\n');
    try {
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                passwordHash: true,
            },
        });
        if (users.length === 0) {
            console.log('❌ Brak użytkowników w bazie danych!');
            console.log('💡 Uruchom: npm run seed');
            return;
        }
        console.log(`✅ Znaleziono ${users.length} użytkowników:\n`);
        for (const user of users) {
            console.log(`📧 Email: ${user.email}`);
            console.log(`👤 Imię: ${user.name}`);
            console.log(`🔑 Rola: ${user.role}`);
            // Test hasła
            const testPassword = user.email === 'admin@example.com' ? 'admin123' : 'doctor123';
            const isValid = await (0, password_1.comparePassword)(testPassword, user.passwordHash);
            console.log(`🔐 Test hasła "${testPassword}": ${isValid ? '✅ POPRAWNE' : '❌ NIEPOPRAWNE'}`);
            console.log('');
        }
        // Sprawdź konkretnie admin@example.com
        const admin = users.find(u => u.email === 'admin@example.com');
        if (admin) {
            console.log('🎯 Test logowania dla admin@example.com:');
            const isValid = await (0, password_1.comparePassword)('admin123', admin.passwordHash);
            if (isValid) {
                console.log('✅ Hasło "admin123" jest poprawne!');
            }
            else {
                console.log('❌ Hasło "admin123" jest niepoprawne!');
                console.log('💡 Uruchom ponownie: npm run seed');
            }
        }
        else {
            console.log('❌ Użytkownik admin@example.com nie istnieje!');
            console.log('💡 Uruchom: npm run seed');
        }
    }
    catch (error) {
        console.error('❌ Błąd:', error.message);
        if (error.code === 'P1000') {
            console.log('\n💡 Problem z połączeniem do bazy danych!');
            console.log('   Sprawdź:');
            console.log('   1. Czy PostgreSQL działa');
            console.log('   2. Czy hasło w backend/.env jest poprawne');
            console.log('   3. Czy baza trichology_db istnieje');
        }
    }
}
main()
    .catch(console.error)
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
//# sourceMappingURL=checkUsers.js.map