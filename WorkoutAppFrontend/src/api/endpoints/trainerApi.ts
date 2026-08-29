import { baseApi } from '../baseApi';

import type { ClientOverview, WeeklyComplianceRow } from '../handlers';
import type {
  CheckIn,
  ClientProfile,
  RedFlagAlert,
  TrainerProfile,
  TrainerSummary,
} from '@/types/models';

export const trainerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRoles: build.query<{ trainer: TrainerProfile; clients: ClientProfile[] }, void>({
      query: () => ({ url: '/session/roles' }),
    }),

    getTrainer: build.query<TrainerProfile, void>({
      query: () => ({ url: '/trainer' }),
    }),

    getClients: build.query<ClientProfile[], void>({
      query: () => ({ url: '/clients' }),
      providesTags: ['ClientList'],
    }),

    getClient: build.query<ClientProfile, string>({
      query: (id) => ({ url: `/clients/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Client', id }],
    }),

    getTrainerSummary: build.query<TrainerSummary, void>({
      query: () => ({ url: '/trainer/summary' }),
      providesTags: ['TrainerSummary'],
    }),

    getAlerts: build.query<RedFlagAlert[], void>({
      query: () => ({ url: '/trainer/alerts' }),
      providesTags: ['Alert'],
    }),

    resolveAlert: build.mutation<RedFlagAlert, string>({
      query: (id) => ({ url: `/trainer/alerts/${id}/resolve`, method: 'POST' }),
      invalidatesTags: ['Alert', 'TrainerSummary'],
    }),

    getCheckIns: build.query<CheckIn[], { status?: 'pending' | 'reviewed'; clientId?: string } | void>({
      query: (args) => ({ url: '/trainer/checkins', params: { ...(args ?? {}) } }),
      providesTags: ['CheckIn'],
    }),

    reviewCheckIn: build.mutation<CheckIn, string>({
      query: (id) => ({ url: `/trainer/checkins/${id}/review`, method: 'POST' }),
      invalidatesTags: ['CheckIn', 'TrainerSummary'],
    }),

    getClientOverview: build.query<ClientOverview, string>({
      query: (id) => ({ url: `/trainer/clients/${id}/overview` }),
      providesTags: (_r, _e, id) => [{ type: 'ClientOverview', id }, 'ClientOverview'],
    }),

    getWeeklyCompliance: build.query<WeeklyComplianceRow[], { clientId: string; weeks?: number }>({
      query: ({ clientId, weeks = 6 }) => ({
        url: `/trainer/clients/${clientId}/compliance`,
        params: { weeks },
      }),
      providesTags: ['Compliance'],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetTrainerQuery,
  useGetClientsQuery,
  useGetClientQuery,
  useGetTrainerSummaryQuery,
  useGetAlertsQuery,
  useResolveAlertMutation,
  useGetCheckInsQuery,
  useReviewCheckInMutation,
  useGetClientOverviewQuery,
  useGetWeeklyComplianceQuery,
} = trainerApi;
