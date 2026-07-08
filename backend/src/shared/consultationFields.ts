/**
 * consultationFields.ts — Backend shared module
 *
 * Single source of truth for all consultation card field definitions (backend copy).
 * Used by: pdfService.ts, consultations.ts (route).
 *
 * NOTE: consultationCardSchema.json is the master file.
 * When you update the schema, copy it to both:
 *   frontend/src/shared/consultationCardSchema.json
 *   backend/src/shared/consultationCardSchema.json
 */

import schema from './consultationCardSchema.json';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FieldDef {
  key: string;
  label: string;
  type: string;
  options?: string[];
  conditional?: string;
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

function collectFields(section: any): FieldDef[] {
  const fields: FieldDef[] = [];
  if (section.fields) fields.push(...(section.fields as FieldDef[]));
  if (section.subsections) {
    for (const sub of section.subsections as SubsectionDef[]) {
      if (sub.fields) fields.push(...sub.fields);
    }
  }
  return fields;
}

// ── Exported constants ────────────────────────────────────────────────────────

export const SECTIONS: SectionDef[] = schema.sections as SectionDef[];

export const SEVERITY_OPTIONS: string[] = schema.severityOptions;

export const ALL_FIELDS: FieldDef[] = SECTIONS.flatMap(collectFields);

/**
 * Fields stored as JSON arrays in the database.
 * Must match the `jsonFields` list in consultations.ts route.
 */
export const JSON_ARRAY_FIELDS: string[] = ALL_FIELDS
  .filter((f) => f.type === 'array')
  .map((f) => f.key);

/** Map: fieldKey → human-readable label */
export const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, f.label])
);

/** Map: fieldKey → options array */
export const FIELD_OPTIONS: Record<string, string[]> = Object.fromEntries(
  ALL_FIELDS
    .filter((f) => f.options)
    .map((f) => [f.key, f.options!])
);

/** Get label for a field key, falling back to the key itself */
export const getFieldLabel = (key: string): string => FIELD_LABELS[key] ?? key;
