/**
 * [CODE-2] DashboardService — extracted from dashboard.ts route handler.
 * Centralizes activity building logic and removes 7× code duplication (CODE-4).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  link: string;
}

interface ActivityConfig {
  idPrefix: string;
  createType: string;
  createTitle: string;
  editType?: string;
  editTitle?: string;
  getSubtitle: (item: any, patients: PatientSummary[]) => string;
  getLink: (item: any) => string;
  hasUpdatedAt?: boolean;
  /** Override the field used for the create date (default: 'createdAt') */
  dateField?: string;
}

interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(value: Date | string | undefined | null): Date {
  if (!value) return new Date(0);
  return value instanceof Date ? value : new Date(value);
}

function toSafeISO(value: Date | string | undefined | null): string {
  const d = toDate(value);
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function findPatientName(patientId: string, patients: PatientSummary[]): string {
  const patient = patients.find((p) => p.id === patientId);
  return patient ? `${patient.firstName} ${patient.lastName}` : 'Nieznany pacjent';
}

/**
 * Generic activity builder — eliminates the repeated forEach pattern.
 * Each entity type only needs a config object describing how to map it.
 */
export function buildActivities(
  items: any[],
  patients: PatientSummary[],
  config: ActivityConfig,
): Activity[] {
  const activities: Activity[] = [];
  const dateKey = config.dateField || 'createdAt';

  for (const item of items) {
    const createdAt = toDate(item[dateKey]);
    if (isNaN(createdAt.getTime())) continue; // skip items with invalid dates
    const subtitle = config.getSubtitle(item, patients);
    const link = config.getLink(item);

    // Create activity
    activities.push({
      id: `${config.idPrefix}-create-${item.id}`,
      type: config.createType,
      title: config.createTitle,
      subtitle,
      date: createdAt.toISOString(),
      link,
    });

    // Edit activity (if entity has updatedAt and it differs from createdAt)
    if (config.hasUpdatedAt !== false && config.editType && config.editTitle && item.updatedAt) {
      const updatedAt = toDate(item.updatedAt);
      if (!isNaN(updatedAt.getTime()) && updatedAt.getTime() > createdAt.getTime() + 1000) {
        activities.push({
          id: `${config.idPrefix}-update-${item.id}-${updatedAt.getTime()}`,
          type: config.editType,
          title: config.editTitle,
          subtitle,
          date: updatedAt.toISOString(),
          link,
        });
      }
    }
  }

  return activities;
}

// ─── Activity Configs ────────────────────────────────────────────────────────

export const ACTIVITY_CONFIGS: Record<string, ActivityConfig> = {
  patients: {
    idPrefix: 'patient',
    createType: 'PATIENT',
    createTitle: 'Dodano nowego pacjenta',
    editType: 'PATIENT_EDIT',
    editTitle: 'Zaktualizowano dane pacjenta',
    getSubtitle: (p) => `${p.firstName} ${p.lastName}`,
    getLink: (p) => `/patients/${p.id}`,
  },

  consultations: {
    idPrefix: 'consultation',
    createType: 'CONSULTATION',
    createTitle: 'Dodano konsultację',
    editType: 'CONSULTATION_EDIT',
    editTitle: 'Zaktualizowano konsultację',
    getSubtitle: (c, patients) => findPatientName(c.patientId, patients),
    getLink: (c) => `/patients/${c.patientId}`,
  },

  visits: {
    idPrefix: 'visit',
    createType: 'VISIT',
    createTitle: 'Dodano wizytę',
    editType: 'VISIT_EDIT',
    editTitle: 'Zaktualizowano wizytę',
    getSubtitle: (v, patients) => {
      const name = findPatientName(v.patientId, patients);
      return v.rodzajZabiegu ? `${name} - ${v.rodzajZabiegu}` : name;
    },
    getLink: (v) => `/patients/${v.patientId}`,
  },

  labResults: {
    idPrefix: 'labresult',
    createType: 'LAB_RESULT',
    createTitle: 'Dodano wynik badań',
    editType: 'LAB_RESULT_EDIT',
    editTitle: 'Zaktualizowano wynik badań',
    getSubtitle: (lr, patients) => findPatientName(lr.patientId, patients),
    getLink: (lr) => `/patients/${lr.patientId}/lab-results`,
  },

  scalpPhotos: {
    idPrefix: 'scalpphoto',
    createType: 'SCALP_PHOTO',
    createTitle: 'Dodano zdjęcie skóry głowy',
    hasUpdatedAt: false,
    getSubtitle: (ph, patients) => {
      const name = findPatientName(ph.patientId, patients);
      return ph.originalFilename ? `${name} - ${ph.originalFilename}` : name;
    },
    getLink: (ph) => `/patients/${ph.patientId}/scalp-photos`,
  },

  carePlans: {
    idPrefix: 'careplan',
    createType: 'CARE_PLAN',
    createTitle: 'Dodano plan pielęgnacyjny',
    editType: 'CARE_PLAN_EDIT',
    editTitle: 'Zaktualizowano plan pielęgnacyjny',
    getSubtitle: (cp, patients) => {
      const name = findPatientName(cp.patientId, patients);
      return cp.title ? `${name} - ${cp.title}` : name;
    },
    getLink: (cp) => `/patients/${cp.patientId}/care-plans`,
  },

  emails: {
    idPrefix: 'email',
    createType: 'EMAIL',
    createTitle: 'Wysłano email',
    hasUpdatedAt: false,
    dateField: 'sentAt',
    getSubtitle: (e, patients) => {
      const name = findPatientName(e.patientId, patients);
      return e.subject ? `${name} - ${e.subject}` : name;
    },
    getLink: (e) => `/patients/${e.patientId}`,
  },
};

/**
 * Build all activities from all entity types and return sorted (newest first).
 */
export function buildAllActivities(
  data: {
    patients: any[];
    consultations: any[];
    visits: any[];
    labResults: any[];
    scalpPhotos: any[];
    carePlans: any[];
    emails: any[];
  },
  limit = 50,
): Activity[] {
  const all: Activity[] = [];

  for (const [key, config] of Object.entries(ACTIVITY_CONFIGS)) {
    const items = (data as any)[key];
    if (items?.length) {
      all.push(...buildActivities(items, data.patients, config));
    }
  }

  // Sort by date descending and limit
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return all.slice(0, limit);
}
