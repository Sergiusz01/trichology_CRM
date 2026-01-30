import type { PrismaClient } from '@prisma/client';

const DEFAULT_LAB_FIELDS = [
  { type: 'NUMBER' as const, label: 'Hemoglobina (HGB)', key: 'hgb', unit: 'g/dL', order: 0 },
  { type: 'NUMBER' as const, label: 'Erytrocyty (RBC)', key: 'rbc', unit: 'M/μL', order: 1 },
  { type: 'NUMBER' as const, label: 'Leukocyty (WBC)', key: 'wbc', unit: 'K/μL', order: 2 },
  { type: 'NUMBER' as const, label: 'Płytki krwi (PLT)', key: 'plt', unit: 'K/μL', order: 3 },
  { type: 'NUMBER' as const, label: 'Ferrytyna', key: 'ferritin', unit: 'ng/mL', order: 10 },
  { type: 'NUMBER' as const, label: 'Żelazo', key: 'iron', unit: 'μg/dL', order: 11 },
  { type: 'NUMBER' as const, label: 'Witamina D3', key: 'vitaminD3', unit: 'ng/mL', order: 20 },
  { type: 'NUMBER' as const, label: 'Witamina B12', key: 'vitaminB12', unit: 'pg/mL', order: 21 },
  { type: 'NUMBER' as const, label: 'Kwas foliowy', key: 'folicAcid', unit: 'ng/mL', order: 22 },
  { type: 'NUMBER' as const, label: 'TSH', key: 'tsh', unit: 'mIU/L', order: 30 },
  { type: 'NUMBER' as const, label: 'FT3', key: 'ft3', unit: 'pg/mL', order: 31 },
  { type: 'NUMBER' as const, label: 'FT4', key: 'ft4', unit: 'ng/dL', order: 32 },
  { type: 'TEXT' as const, label: 'Notatki', key: 'notes', order: 100 },
];

export async function initializeDefaultLabResultTemplate(prisma: PrismaClient): Promise<void> {
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
      fields: DEFAULT_LAB_FIELDS as object,
      isDefault: true,
      isActive: true,
    },
  });
}
