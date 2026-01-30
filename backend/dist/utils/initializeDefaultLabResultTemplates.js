"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDefaultLabResultTemplate = initializeDefaultLabResultTemplate;
const DEFAULT_LAB_FIELDS = [
    { type: 'NUMBER', label: 'Hemoglobina (HGB)', key: 'hgb', unit: 'g/dL', order: 0 },
    { type: 'NUMBER', label: 'Erytrocyty (RBC)', key: 'rbc', unit: 'M/μL', order: 1 },
    { type: 'NUMBER', label: 'Leukocyty (WBC)', key: 'wbc', unit: 'K/μL', order: 2 },
    { type: 'NUMBER', label: 'Płytki krwi (PLT)', key: 'plt', unit: 'K/μL', order: 3 },
    { type: 'NUMBER', label: 'Ferrytyna', key: 'ferritin', unit: 'ng/mL', order: 10 },
    { type: 'NUMBER', label: 'Żelazo', key: 'iron', unit: 'μg/dL', order: 11 },
    { type: 'NUMBER', label: 'Witamina D3', key: 'vitaminD3', unit: 'ng/mL', order: 20 },
    { type: 'NUMBER', label: 'Witamina B12', key: 'vitaminB12', unit: 'pg/mL', order: 21 },
    { type: 'NUMBER', label: 'Kwas foliowy', key: 'folicAcid', unit: 'ng/mL', order: 22 },
    { type: 'NUMBER', label: 'TSH', key: 'tsh', unit: 'mIU/L', order: 30 },
    { type: 'NUMBER', label: 'FT3', key: 'ft3', unit: 'pg/mL', order: 31 },
    { type: 'NUMBER', label: 'FT4', key: 'ft4', unit: 'ng/dL', order: 32 },
    { type: 'TEXT', label: 'Notatki', key: 'notes', order: 100 },
];
async function initializeDefaultLabResultTemplate(prisma) {
    const existing = await prisma.labResultTemplate.findFirst({
        where: { isDefault: true, isActive: true, doctorId: null },
    });
    if (existing) {
        return;
    }
    await prisma.labResultTemplate.create({
        data: {
            name: 'Domyślny (Morfologia, żelazo, witaminy, tarczyca)',
            doctorId: null,
            fields: DEFAULT_LAB_FIELDS,
            isDefault: true,
            isActive: true,
        },
    });
}
//# sourceMappingURL=initializeDefaultLabResultTemplates.js.map