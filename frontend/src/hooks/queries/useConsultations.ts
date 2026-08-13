import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

export interface Consultation {
  id: string;
  consultationDate: string | null;
  isArchived: boolean;
  patient: { id: string; firstName: string; lastName: string; email?: string };
  doctor?: { id: string; name: string; email: string };
}

export interface ConsultationsParams {
  page: number;
  limit: number;
  search?: string;
  archived?: 'true' | 'false' | 'all';
}

export interface ConsultationsResponse {
  consultations: Consultation[];
  pagination: { total: number; page: number; limit: number };
}

// ── Query Keys ────────────────────────────────────────────────────────────────
export const consultationKeys = {
  all: ['consultations'] as const,
  lists: () => [...consultationKeys.all, 'list'] as const,
  list: (params: ConsultationsParams) => [...consultationKeys.lists(), params] as const,
  byPatient: (patientId: string) => [...consultationKeys.all, 'patient', patientId] as const,
  detail: (id: string) => [...consultationKeys.all, 'detail', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────
export function useConsultations(params: ConsultationsParams) {
  return useQuery<ConsultationsResponse>({
    queryKey: consultationKeys.list(params),
    queryFn: async () => {
      const res = await api.get('/consultations', {
        params: {
          page: params.page + 1, // MUI is 0-indexed, API is 1-indexed
          limit: params.limit,
          search: params.search || undefined,
          archived: params.archived || undefined,
        },
      });
      return res.data;
    },
  });
}

export function usePatientConsultations(patientId: string | undefined) {
  return useQuery({
    queryKey: consultationKeys.byPatient(patientId!),
    queryFn: async () => {
      const res = await api.get(`/consultations/patient/${patientId}`, {
        _skipErrorToast: true,
      });
      return res.data as Consultation[];
    },
    enabled: !!patientId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useDeleteConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/consultations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    },
  });
}

export function useRestoreConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/consultations/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    },
  });
}

export function usePermanentDeleteConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/consultations/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    },
  });
}
