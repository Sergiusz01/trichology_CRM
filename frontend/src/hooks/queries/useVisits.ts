import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

export interface Visit {
  id: string;
  data: string;
  rodzajZabiegu: string;
  status: 'ZAPLANOWANA' | 'ODBYTA' | 'NIEOBECNOSC' | 'ANULOWANA';
  cena?: number;
  notatki?: string;
  patient: { id: string; firstName: string; lastName: string };
  patientId?: string;
  numerWSerii?: number;
  liczbaSerii?: number;
}

export interface CreateVisitData {
  patientId: string;
  data: string;
  rodzajZabiegu: string;
  status: Visit['status'];
  cena?: number;
  notatki?: string;
  numerWSerii?: number;
  liczbaSerii?: number;
}

// ── Query Keys ────────────────────────────────────────────────────────────────
export const visitKeys = {
  all: ['visits'] as const,
  lists: () => [...visitKeys.all, 'list'] as const,
  byPatient: (patientId: string) => [...visitKeys.all, 'patient', patientId] as const,
  detail: (id: string) => [...visitKeys.all, 'detail', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────
export function useVisits() {
  return useQuery({
    queryKey: visitKeys.lists(),
    queryFn: async () => {
      const res = await api.get('/visits');
      return (res.data.data || []) as Visit[];
    },
  });
}

export function usePatientVisits(patientId: string | undefined) {
  return useQuery({
    queryKey: visitKeys.byPatient(patientId!),
    queryFn: async () => {
      const res = await api.get(`/visits/patient/${patientId}`, {
        _skipErrorToast: true,
      });
      // Guard: API may return an error object instead of an array on 404
      const data = res.data;
      return (Array.isArray(data) ? data : Array.isArray(data?.visits) ? data.visits : []) as Visit[];
    },
    enabled: !!patientId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVisitData) => api.post('/visits', data),
    onSuccess: (_res, data) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.byPatient(data.patientId) });
    },
  });
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVisitData> }) =>
      api.put(`/visits/${id}`, data),
    onSuccess: (_res, { data }) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      if (data.patientId) {
        queryClient.invalidateQueries({ queryKey: visitKeys.byPatient(data.patientId) });
      }
    },
  });
}

export function useUpdateVisitStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, status, patientId }: { visitId: string; status: Visit['status']; patientId: string }) =>
      api.patch(`/visits/${visitId}/status`, { status }),
    onSuccess: (_res, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.byPatient(patientId) });
    },
  });
}

export function useDeleteVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, patientId }: { visitId: string; patientId: string }) =>
      api.delete(`/visits/${visitId}`),
    onSuccess: (_res, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.byPatient(patientId) });
    },
  });
}
