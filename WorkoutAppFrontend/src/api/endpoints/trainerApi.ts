import { baseApi } from '../baseApi';

import type {
  ClientGoalPatch,
  ClientInvite,
  ClientOverview,
  IntakeInput,
  ProfileInput,
  WeeklyComplianceRow,
} from '../handlers';
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
      providesTags: ['Trainer'],
    }),

    updateTrainer: build.mutation<TrainerProfile, Partial<Pick<TrainerProfile, 'tracks'>>>({
      query: (body) => ({ url: '/trainer', method: 'PATCH', body }),
      invalidatesTags: ['Trainer'],
    }),

    getClients: build.query<ClientProfile[], void>({
      query: () => ({ url: '/clients' }),
      providesTags: ['ClientList'],
    }),

    getClient: build.query<ClientProfile, string>({
      query: (id) => ({ url: `/clients/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Client', id }],
    }),

    updateClient: build.mutation<ClientProfile, { id: string; patch: ClientGoalPatch }>({
      query: ({ id, patch }) => ({ url: `/clients/${id}`, method: 'PATCH', body: patch }),
      // New macro targets rewrite today's nutrition day, and the compliance
      // rows are all measured against the target — both go stale on a save.
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Client', id },
        { type: 'ClientOverview', id },
        'ClientList',
        'NutritionDay',
        'Compliance',
      ],
    }),

    /**
     * Self-signup. Invalidates nothing on purpose: what this creates is an
     * identity, and identity is read through `resolveIdentity()` rather than
     * RTK Query, so the caller re-resolves the session instead.
     */
    createProfile: build.mutation<{ id: string }, ProfileInput>({
      query: (body) => ({ url: '/session/profile', method: 'POST', body }),
    }),

    inviteClient: build.mutation<ClientProfile, ClientInvite>({
      query: (body) => ({ url: '/clients/invite', method: 'POST', body }),
      invalidatesTags: ['ClientList', 'Trainer', 'TrainerSummary', 'Thread'],
    }),

    revokeInvite: build.mutation<{ id: string }, string>({
      query: (id) => ({ url: `/clients/${id}/invite`, method: 'DELETE' }),
      invalidatesTags: ['ClientList', 'Trainer', 'TrainerSummary', 'Thread'],
    }),

    /** The client's own first-run setup. Clears the onboarding redirect. */
    completeIntake: build.mutation<null, { clientId: string; input: IntakeInput }>({
      query: ({ clientId, input }) => ({
        url: `/clients/${clientId}/intake`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: (_r, _e, { clientId }) => [
        { type: 'Client', id: clientId },
        { type: 'ClientOverview', id: clientId },
        { type: 'Metric', id: clientId },
        'Alert',
        'Thread',
        'Message',
      ],
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
  useUpdateTrainerMutation,
  useGetClientsQuery,
  useGetClientQuery,
  useUpdateClientMutation,
  useCreateProfileMutation,
  useInviteClientMutation,
  useRevokeInviteMutation,
  useCompleteIntakeMutation,
  useGetTrainerSummaryQuery,
  useGetAlertsQuery,
  useResolveAlertMutation,
  useGetCheckInsQuery,
  useReviewCheckInMutation,
  useGetClientOverviewQuery,
  useGetWeeklyComplianceQuery,
} = trainerApi;
