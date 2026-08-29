import { baseApi } from '../baseApi';

import type {
  AiFoodSuggestion,
  FoodEntry,
  FoodItem,
  ISODate,
  NutritionDay,
} from '@/types/models';

export const nutritionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNutritionDay: build.query<NutritionDay, { clientId: string; date: ISODate }>({
      query: ({ clientId, date }) => ({ url: `/nutrition/days/${date}`, params: { clientId } }),
      providesTags: (_r, _e, { clientId, date }) => [{ type: 'NutritionDay', id: `${clientId}:${date}` }],
    }),

    getNutritionRange: build.query<NutritionDay[], { clientId: string; days?: number }>({
      query: ({ clientId, days = 30 }) => ({ url: '/nutrition/days', params: { clientId, days } }),
      providesTags: (_r, _e, { clientId }) => [{ type: 'NutritionDay', id: `range:${clientId}` }],
    }),

    searchFoods: build.query<FoodItem[], string | void>({
      query: (q) => ({ url: '/foods', params: { q: q ?? '' } }),
      providesTags: ['Food'],
    }),

    getFrequentFoods: build.query<FoodItem[], void>({
      query: () => ({ url: '/foods/frequent' }),
      providesTags: ['Food'],
    }),

    getAiSuggestions: build.query<AiFoodSuggestion[], void>({
      query: () => ({ url: '/ai/suggestions' }),
    }),

    addFoodEntry: build.mutation<NutritionDay, Omit<FoodEntry, 'id' | 'loggedAt'>>({
      query: (body) => ({ url: '/nutrition/entries', method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'NutritionDay', id: `${arg.clientId}:${arg.date}` },
        { type: 'NutritionDay', id: `range:${arg.clientId}` },
        'ClientOverview',
        'Compliance',
      ],
    }),

    addFoodEntries: build.mutation<
      NutritionDay,
      { clientId: string; date: ISODate; entries: Array<Omit<FoodEntry, 'id' | 'loggedAt'>> }
    >({
      query: ({ entries }) => ({ url: '/nutrition/entries/batch', method: 'POST', body: { entries } }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'NutritionDay', id: `${arg.clientId}:${arg.date}` },
        { type: 'NutritionDay', id: `range:${arg.clientId}` },
        'ClientOverview',
        'Compliance',
      ],
    }),

    removeFoodEntry: build.mutation<NutritionDay, { id: string; clientId: string; date: ISODate }>({
      query: ({ id, clientId, date }) => ({
        url: `/nutrition/entries/${id}`,
        method: 'DELETE',
        params: { clientId, date },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'NutritionDay', id: `${arg.clientId}:${arg.date}` },
        { type: 'NutritionDay', id: `range:${arg.clientId}` },
        'ClientOverview',
      ],
    }),
  }),
});

export const {
  useGetNutritionDayQuery,
  useGetNutritionRangeQuery,
  useSearchFoodsQuery,
  useGetFrequentFoodsQuery,
  useGetAiSuggestionsQuery,
  useAddFoodEntryMutation,
  useAddFoodEntriesMutation,
  useRemoveFoodEntryMutation,
} = nutritionApi;
