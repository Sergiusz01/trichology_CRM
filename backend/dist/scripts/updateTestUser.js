"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTestUser = updateTestUser;
const prisma_1 = require("../prisma");
const password_1 = require("../utils/password");
async function updateTestUser() {
    try {
        console.log('🔄 Aktualizowanie użytkownika testowego...');
        // Find existing doctor user
        const existingDoctor = await prisma_1.prisma.user.findFirst({
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
            const newPassword = await (0, password_1.hashPassword)('test123');
            // Update to Agnieszka Polańska
            const updated = await prisma_1.prisma.user.update({
                where: { id: existingDoctor.id },
                data: {
                    name: 'Agnieszka Polańska',
                    email: 'agnieszka.polanska@example.com',
                    passwordHash: newPassword,
                },
            });
            console.log(`✅ Zaktualizowano użytkownika na: ${updated.name} (${updated.email})`);
            // Update consultation template for this user
            const template = await prisma_1.prisma.consultationTemplate.findFirst({
                where: {
                    doctorId: updated.id,
                    isDefault: true,
                },
            });
            if (template) {
                console.log(`✅ Szablon konsultacji już istnieje dla ${updated.name}`);
            }
            else {
                // Create template if doesn't exist
                const { generateDefaultFields } = await Promise.resolve().then(() => __importStar(require('./seedDefaultConsultationTemplate')));
                await prisma_1.prisma.consultationTemplate.create({
                    data: {
                        name: 'Standardowy arkusz konsultacji',
                        doctorId: updated.id,
                        fields: generateDefaultFields(),
                        isDefault: true,
                        isActive: true,
                    },
                });
                console.log(`✅ Utworzono szablon konsultacji dla ${updated.name}`);
            }
        }
        else {
            // Create new user if doesn't exist
            const newPassword = await (0, password_1.hashPassword)('test123');
            const newUser = await prisma_1.prisma.user.create({
                data: {
                    name: 'Agnieszka Polańska',
                    email: 'agnieszka.polanska@example.com',
                    passwordHash: newPassword,
                    role: 'DOCTOR',
                },
            });
            console.log(`✅ Utworzono nowego użytkownika: ${newUser.name} (${newUser.email})`);
            // Create template
            const { generateDefaultFields } = await Promise.resolve().then(() => __importStar(require('./seedDefaultConsultationTemplate')));
            await prisma_1.prisma.consultationTemplate.create({
                data: {
                    name: 'Standardowy arkusz konsultacji',
                    doctorId: newUser.id,
                    fields: generateDefaultFields(),
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
    }
    catch (error) {
        console.error('❌ Błąd aktualizacji:', error);
        throw error;
    }
    finally {
        await prisma_1.prisma.$disconnect();
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
//# sourceMappingURL=updateTestUser.js.map