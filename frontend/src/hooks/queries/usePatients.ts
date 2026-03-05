import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  isArchived: boolean;
  assignedDoctorId?: string | null;
  assignedDoctor?: { id: string; name: string } | null;
}

export interface PatientsParams {
  page: number;
  limit: number;
  search?: string;
  archived?: boolean;
  sortBy?: 'createdAt' | 'lastName' | 'lastVisit';
  sortOrder?: 'asc' | 'desc';
}

export interface PatientsResponse {
  patients: Patient[];
  pagination: { total: number; page: number; limit: number };
}

// ── Query Keys ────────────────────────────────────────────────────────────────
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: PatientsParams) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────
export function usePatients(params: PatientsParams) {
  return useQuery<PatientsResponse>({
    queryKey: patientKeys.list(params),
    queryFn: async () => {
      const res = await api.get('/patients', {
        params: {
          page: params.page + 1, // MUI is 0-indexed, API is 1-indexed
          limit: params.limit,
          search: params.search || undefined,
          archived: params.archived,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        },
        _skipErrorToast: true,
      });
      return res.data;
    },
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id!),
    queryFn: async () => {
      const res = await api.get(`/patients/${id}`, { _skipErrorToast: true });
      return res.data;
    },
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useArchivePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => api.delete(`/patients/${patientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useRestorePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => api.post(`/patients/${patientId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function usePermanentDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => api.delete(`/patients/${patientId}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> & { notes?: string } }) =>
      api.put(`/patients/${id}`, data),
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}
