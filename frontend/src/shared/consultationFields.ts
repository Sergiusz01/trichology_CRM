/**
 * consultationFields.ts — Frontend shared module
 *
 * Single source of truth for all consultation card field definitions.
 * Imported by: ConsultationCardForm, ConsultationViewPage, pdfService (backend copy).
 *
 * DO NOT add field options or labels in any other file — edit the JSON instead.
 */

import schema from './consultationCardSchema.json';

// ── Types ──────────────────────────────────────────────────────────────────────

export type FieldType = 'string' | 'text' | 'array' | 'select' | 'yesno' | 'severity' | 'duration';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  conditional?: string; // e.g. "medications" or "seborrheaType:Inne"
}

export interface SubsectionDef {
  id: string;
  title: string;
  fields: FieldDef[];
}

export interface SectionDef {
  id: string;
  title: string;
  fields?: FieldDef[];
  subsections?: SubsectionDef[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively collect all FieldDef objects from a section (handles subsections) */
function collectFields(section: any): FieldDef[] {
  const fields: FieldDef[] = [];
  if (section.fields) fields.push(...section.fields);
  if (section.subsections) {
    for (const sub of section.subsections) {
      if (sub.fields) fields.push(...sub.fields);
    }
  }
  return fields;
}

// ── Exported constants ────────────────────────────────────────────────────────

/** All section definitions in order */
export const SECTIONS: SectionDef[] = schema.sections as SectionDef[];

/** Severity chip options (shared with SeveritySelector) */
export const SEVERITY_OPTIONS: string[] = schema.severityOptions;

/** Flat list of all field definitions across all sections */
export const ALL_FIELDS: FieldDef[] = SECTIONS.flatMap(collectFields);

/**
 * Fields stored as JSON arrays in the database.
 * Used when serialising (form → API) and deserialising (API → form).
 */
export const JSON_ARRAY_FIELDS: string[] = ALL_FIELDS
  .filter((f) => f.type === 'array')
  .map((f) => f.key);

/**
 * Map: fieldKey → human-readable label.
 * e.g. FIELD_LABELS['hairLossSeverity'] === 'Nasilenie'
 */
export const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, f.label])
);

/**
 * Map: fieldKey → options array (for CheckboxGroup / Select).
 * Only populated for array/select fields.
 */
export const FIELD_OPTIONS: Record<string, string[]> = Object.fromEntries(
  ALL_FIELDS
    .filter((f) => f.options)
    .map((f) => [f.key, f.options!])
);

/**
 * Initial form state — all string fields → '', all array fields → [].
 * Spread this as the baseline and then override with existing data.
 */
export const INITIAL_FORM_DATA: Record<string, any> = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, f.type === 'array' ? [] : ''])
);
