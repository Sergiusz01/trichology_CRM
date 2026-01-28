/**
 * Shared API types. Use these instead of ad-hoc shapes or `any`.
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string; code?: string }>;
  requestId?: string;
}

export interface PatientBase {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

export interface UpcomingVisit {
  id: string;
  data: string;
  rodzajZabiegu: string;
  status: string;
  numerWSerii?: number | null;
  liczbaSerii?: number | null;
  cena?: number | string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface DashboardStats {
  patientsCount: number;
  consultationsCount: number;
  emailsSentCount: number;
  patientsThisWeek: number;
  consultationsThisWeek: number;
  patientsWithoutConsultation: number;
}

export interface WeeklyRevenue {
  plannedRevenue: number;
  completedRevenue: number;
  totalExpectedRevenue: number;
  visitsThisWeek: {
    zaplanowana: number;
    odbyta: number;
    nieobecnosc: number;
    anulowana: number;
  };
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  link: string;
}
