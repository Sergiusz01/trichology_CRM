"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDefaultConsultationTemplate = initializeDefaultConsultationTemplate;
const prisma_1 = require("../prisma");
const seedDefaultConsultationTemplate_1 = require("../scripts/seedDefaultConsultationTemplate");
async function initializeDefaultConsultationTemplate(prisma = prisma_1.prisma) {
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
        const defaultFields = (0, seedDefaultConsultationTemplate_1.generateDefaultFields)();
        const scaleKeys = new Set(['section_norwood_scale', 'norwoodScale', 'section_ludwig_scale', 'ludwigScale']);
        const scaleFields = defaultFields.filter((field) => scaleKeys.has(field.key));
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
                else if (existing.name === 'Karta konsultacyjna (PDF)' && Array.isArray(existing.fields)) {
                    const existingKeys = new Set(existing.fields.map((field) => field.key));
                    const missingScaleFields = scaleFields.filter((field) => !existingKeys.has(field.key));
                    if (missingScaleFields.length > 0) {
                        const mergedFields = [...existing.fields, ...missingScaleFields]
                            .map((field, index) => ({ ...field, order: index }));
                        await db.consultationTemplate.update({
                            where: { id: existing.id },
                            data: {
                                fields: mergedFields,
                            },
                        });
                        console.log(`✅ Dodano pola skali do szablonu konsultacji dla ${doctor.email}`);
                    }
                }
            }
            else {
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
    }
    catch (error) {
        console.error('❌ Błąd podczas inicjalizacji szablonu konsultacji:', error);
    }
}
//# sourceMappingURL=initializeDefaultConsultationTemplate.js.map