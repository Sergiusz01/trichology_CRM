import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

interface Consultation { id: string; consultationDate: string; [key: string]: unknown }
interface LabResult { id: string; date: string; [key: string]: unknown }
interface ScalpPhoto { id: string; filename: string; [key: string]: unknown }
interface CarePlan { id: string; title: string; [key: string]: unknown }
interface Visit { id: string; data: string; [key: string]: unknown }

// ── Query Keys ────────────────────────────────────────────────────────────────
export const patientDetailKeys = {
  patient: (id: string) => ['patients', 'detail', id] as const,
  consultations: (id: string, archived: boolean) => ['consultations', 'patient', id, { archived }] as const,
  labResults: (id: string, archived: boolean) => ['labResults', 'patient', id, { archived }] as const,
  scalpPhotos: (id: string) => ['scalpPhotos', 'patient', id] as const,
  carePlans: (id: string, archived: boolean) => ['carePlans', 'patient', id, { archived }] as const,
  visits: (id: string) => ['visits', 'patient', id] as const,
};

// ── Patient ───────────────────────────────────────────────────────────────────
export function usePatientDetail(id: string | undefined) {
  return useQuery({
    queryKey: patientDetailKeys.patient(id!),
    queryFn: async () => {
      const res = await api.get(`/patients/${id}`, { _skipErrorToast: true });
      return res.data.patient;
    },
    enabled: !!id,
  });
}

// ── Consultations ─────────────────────────────────────────────────────────────
export function usePatientDetailConsultations(id: string | undefined, archived: boolean) {
  return useQuery({
    queryKey: patientDetailKeys.consultations(id!, archived),
    queryFn: async () => {
      const res = await api.get(`/consultations/patient/${id}`, {
        params: { archived: archived ? 'true' : 'false' },
        _skipErrorToast: true,
      });
      return (res.data.consultations || []) as Consultation[];
    },
    enabled: !!id,
  });
}

// ── Lab Results ───────────────────────────────────────────────────────────────
export function usePatientLabResults(id: string | undefined, archived: boolean) {
  return useQuery({
    queryKey: patientDetailKeys.labResults(id!, archived),
    queryFn: async () => {
      const res = await api.get(`/lab-results/patient/${id}`, {
        params: { archived: archived ? 'true' : 'false' },
        _skipErrorToast: true,
      });
      return (res.data.labResults || []) as LabResult[];
    },
    enabled: !!id,
  });
}

// ── Scalp Photos ──────────────────────────────────────────────────────────────
export function usePatientScalpPhotos(id: string | undefined) {
  return useQuery({
    queryKey: patientDetailKeys.scalpPhotos(id!),
    queryFn: async () => {
      const res = await api.get(`/patients/${id}`, { _skipErrorToast: true });
      return (res.data.patient?.scalpPhotos || []) as ScalpPhoto[];
    },
    enabled: !!id,
  });
}

// ── Care Plans ────────────────────────────────────────────────────────────────
export function usePatientCarePlans(id: string | undefined, archived: boolean) {
  return useQuery({
    queryKey: patientDetailKeys.carePlans(id!, archived),
    queryFn: async () => {
      const res = await api.get(`/care-plans/patient/${id}`, {
        params: { archived: archived ? 'true' : 'false' },
        _skipErrorToast: true,
      });
      return (res.data.carePlans || []) as CarePlan[];
    },
    enabled: !!id,
  });
}

// ── Visits ────────────────────────────────────────────────────────────────────
export function usePatientDetailVisits(id: string | undefined) {
  return useQuery({
    queryKey: patientDetailKeys.visits(id!),
    queryFn: async () => {
      const res = await api.get(`/visits/patient/${id}`, { _skipErrorToast: true });
      return (res.data.visits || []) as Visit[];
    },
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
type DeleteType = 'patient' | 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan' | 'visit';
type RestoreType = 'consultation' | 'labResult' | 'carePlan';

export function useDeletePatientItem(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: DeleteType; id: string }) => {
      const endpoints: Record<DeleteType, string> = {
        patient: `/patients/${id}`,
        consultation: `/consultations/${id}`,
        labResult: `/lab-results/${id}`,
        scalpPhoto: `/scalp-photos/${id}`,
        carePlan: `/care-plans/${id}`,
        visit: `/visits/${id}`,
      };
      return api.delete(endpoints[type]);
    },
    onSuccess: (_res, { type }) => {
      // Invalidate relevant queries based on what was deleted
      if (type === 'consultation') {
        queryClient.invalidateQueries({ queryKey: ['consultations', 'patient', patientId] });
      } else if (type === 'labResult') {
        queryClient.invalidateQueries({ queryKey: ['labResults', 'patient', patientId] });
      } else if (type === 'scalpPhoto') {
        queryClient.invalidateQueries({ queryKey: patientDetailKeys.patient(patientId) });
        queryClient.invalidateQueries({ queryKey: patientDetailKeys.scalpPhotos(patientId) });
      } else if (type === 'carePlan') {
        queryClient.invalidateQueries({ queryKey: ['carePlans', 'patient', patientId] });
      } else if (type === 'visit') {
        queryClient.invalidateQueries({ queryKey: patientDetailKeys.visits(patientId) });
      } else if (type === 'patient') {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      }
    },
  });
}

export function useRestorePatientItem(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: RestoreType; id: string }) => {
      const endpoints: Record<RestoreType, string> = {
        consultation: `/consultations/${id}/restore`,
        labResult: `/lab-results/${id}/restore`,
        carePlan: `/care-plans/${id}/restore`,
      };
      return api.post(endpoints[type]);
    },
    onSuccess: (_res, { type }) => {
      if (type === 'consultation') {
        queryClient.invalidateQueries({ queryKey: ['consultations', 'patient', patientId] });
      } else if (type === 'labResult') {
        queryClient.invalidateQueries({ queryKey: ['labResults', 'patient', patientId] });
      } else if (type === 'carePlan') {
        queryClient.invalidateQueries({ queryKey: ['carePlans', 'patient', patientId] });
      }
    },
  });
}

export function usePermanentDeletePatientItem(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: RestoreType; id: string }) => {
      const endpoints: Record<RestoreType, string> = {
        consultation: `/consultations/${id}/permanent`,
        labResult: `/lab-results/${id}/permanent`,
        carePlan: `/care-plans/${id}/permanent`,
      };
      return api.delete(endpoints[type]);
    },
    onSuccess: (_res, { type }) => {
      if (type === 'consultation') {
        queryClient.invalidateQueries({ queryKey: ['consultations', 'patient', patientId] });
      } else if (type === 'labResult') {
        queryClient.invalidateQueries({ queryKey: ['labResults', 'patient', patientId] });
      } else if (type === 'carePlan') {
        queryClient.invalidateQueries({ queryKey: ['carePlans', 'patient', patientId] });
      }
    },
  });
}
