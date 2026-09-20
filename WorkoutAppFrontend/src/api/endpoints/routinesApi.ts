import { baseApi } from '../baseApi';

import type { RoutineDayInput, RoutineInput } from '../handlers';
import type { AssignedRoutine, Routine } from '@/types/models';

/**
 * Routine templates and the assignments that put them in front of clients.
 *
 * Two resources, deliberately: a `Routine` is the trainer's weekly template,
 * and a `RoutineAssignment` is one client's copy of it — which may have been
 * customised for them alone. There is at most one assignment per client:
 * assigning replaces, and nothing in the app unassigns. Everything client-facing reads the assignment, so
 * a per-client tweak can never leak back into the library.
 *
 * Mutations invalidate both tags broadly: the library is small, and every write
 * can move a routine, its assignment count and a client's view at once.
 */
export const routinesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /* ------------------------------------------------------------ templates */
    getRoutines: build.query<Routine[], void>({
      query: () => ({ url: '/routines' }),
      providesTags: ['Routine'],
    }),

    getRoutine: build.query<Routine, string>({
      query: (id) => ({ url: `/routines/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Routine', id }],
    }),

    createRoutine: build.mutation<Routine, RoutineInput>({
      query: (body) => ({ url: '/routines', method: 'POST', body }),
      invalidatesTags: ['Routine', 'RoutineAssignment'],
    }),

    updateRoutine: build.mutation<Routine, { id: string; patch: Partial<RoutineInput> }>({
      query: ({ id, patch }) => ({ url: `/routines/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Routine', 'RoutineAssignment'],
    }),

    assignRoutine: build.mutation<Routine, { id: string; clientIds: string[] }>({
      query: ({ id, clientIds }) => ({
        url: `/routines/${id}/assign`,
        method: 'POST',
        body: { clientIds },
      }),
      invalidatesTags: ['Routine', 'RoutineAssignment'],
    }),

    duplicateRoutine: build.mutation<Routine, string>({
      query: (id) => ({ url: `/routines/${id}/duplicate`, method: 'POST' }),
      invalidatesTags: ['Routine'],
    }),

    deleteRoutine: build.mutation<{ id: string }, string>({
      query: (id) => ({ url: `/routines/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Routine', 'RoutineAssignment'],
    }),

    /* ---------------------------------------------------------- assignments */
    /** Every routine one client has been given, resolved to what they see. */
    getClientRoutines: build.query<AssignedRoutine[], { clientId: string }>({
      query: ({ clientId }) => ({ url: '/assignments', params: { clientId } }),
      providesTags: ['RoutineAssignment'],
    }),

    /** Every client following one routine, with whether they have diverged. */
    getRoutineAssignments: build.query<AssignedRoutine[], { routineId: string }>({
      query: ({ routineId }) => ({ url: '/assignments', params: { routineId } }),
      providesTags: ['RoutineAssignment'],
    }),

    getAssignment: build.query<AssignedRoutine, string>({
      query: (id) => ({ url: `/assignments/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'RoutineAssignment', id }],
    }),

    /**
     * Put one client on one routine. A client follows exactly one at a time, so
     * this de-allocates whatever they were following.
     */
    createAssignment: build.mutation<AssignedRoutine, { routineId: string; clientId: string }>({
      query: (body) => ({ url: '/assignments', method: 'POST', body }),
      invalidatesTags: ['Routine', 'RoutineAssignment'],
    }),

    /** Customise this client's copy. The library template is untouched. */
    customiseAssignment: build.mutation<AssignedRoutine, { id: string; days: RoutineDayInput[] }>({
      query: ({ id, days }) => ({ url: `/assignments/${id}`, method: 'PATCH', body: { days } }),
      invalidatesTags: ['RoutineAssignment'],
    }),

    /** Drop the customisation and follow the template again. */
    resetAssignment: build.mutation<AssignedRoutine, string>({
      query: (id) => ({ url: `/assignments/${id}/reset`, method: 'POST' }),
      invalidatesTags: ['RoutineAssignment'],
    }),
  }),
});

export const {
  useGetRoutinesQuery,
  useGetRoutineQuery,
  useCreateRoutineMutation,
  useUpdateRoutineMutation,
  useAssignRoutineMutation,
  useDuplicateRoutineMutation,
  useDeleteRoutineMutation,
  useGetClientRoutinesQuery,
  useGetRoutineAssignmentsQuery,
  useGetAssignmentQuery,
  useCreateAssignmentMutation,
  useCustomiseAssignmentMutation,
  useResetAssignmentMutation,
} = routinesApi;
