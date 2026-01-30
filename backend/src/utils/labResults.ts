type LabValue = {
  value?: number;
  refLow?: number;
  refHigh?: number;
};

export const calculateFlag = (value: LabValue): 'LOW' | 'NORMAL' | 'HIGH' | null => {
  if (value.value === undefined || value.value === null) {
    return null;
  }

  if (value.refLow !== undefined && value.value < value.refLow) {
    return 'LOW';
  }

  if (value.refHigh !== undefined && value.value > value.refHigh) {
    return 'HIGH';
  }

  return 'NORMAL';
};

export const calculateLabFlags = (data: any): any => {
  const result = { ...data };

  // Helper to calculate flag for a parameter
  const setFlag = (prefix: string) => {
    const value = data[prefix];
    const refLow = data[`${prefix}RefLow`];
    const refHigh = data[`${prefix}RefHigh`];

    if (value !== undefined && value !== null) {
      result[`${prefix}Flag`] = calculateFlag({ value, refLow, refHigh });
    }
  };

  // Calculate flags for all parameters
  const parameters = [
    'hgb', 'rbc', 'wbc', 'plt',
    'crp',
    'iron', 'ferritin',
    'vitaminD3', 'vitaminB12', 'folicAcid',
    'tsh', 'ft3', 'ft4', 'antiTPO', 'antiTG', 'trab',
    'estrogen', 'progesterone', 'testosterone', 'dheas', 'prolactin',
    'glucose', 'insulin', 'hba1c',
  ];

  parameters.forEach(param => setFlag(param));

  // HOMA-IR is calculated differently (no standard ref ranges, but we can set flag if needed)
  if (data.homaIR !== undefined && data.homaIR !== null) {
    // HOMA-IR > 2.5 is often considered insulin resistance
    if (data.homaIRRefHigh !== undefined) {
      result.homaIRFlag = data.homaIR > data.homaIRRefHigh ? 'HIGH' : 'NORMAL';
    }
  }

  return result;
};

export type LabResultTemplateField = {
  key: string;
  type: string;
  label: string;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  order?: number;
  options?: string[];
};

export function calculateDynamicDataFlags(
  fields: LabResultTemplateField[],
  dynamicData: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...dynamicData };
  for (const f of fields) {
    if (f.type !== 'NUMBER') continue;
    const v = dynamicData[f.key];
    if (v === null || v === undefined || typeof v !== 'number') continue;
    const refLow = (f.refLow ?? (dynamicData[`${f.key}RefLow`] as number)) as number | undefined;
    const refHigh = (f.refHigh ?? (dynamicData[`${f.key}RefHigh`] as number)) as number | undefined;
    let flag: 'LOW' | 'NORMAL' | 'HIGH' | null = null;
    if (refLow !== undefined && refLow !== null && v < refLow) flag = 'LOW';
    else if (refHigh !== undefined && refHigh !== null && v > refHigh) flag = 'HIGH';
    else if (refLow != null || refHigh != null) flag = 'NORMAL';
    if (flag !== null) (out as Record<string, unknown>)[`${f.key}Flag`] = flag;
  }
  return out;
}


