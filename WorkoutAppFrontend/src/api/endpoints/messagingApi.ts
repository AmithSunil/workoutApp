import { baseApi } from '../baseApi';

import type { Message, MessageAttachment, Thread } from '@/types/models';

export const messagingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getThreads: build.query<Thread[], void>({
      query: () => ({ url: '/threads' }),
      providesTags: ['Thread'],
    }),

    getThread: build.query<Thread, string>({
      query: (id) => ({ url: `/threads/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Thread', id }],
    }),

    getMessages: build.query<Message[], string>({
      query: (threadId) => ({ url: `/threads/${threadId}/messages` }),
      providesTags: (_r, _e, threadId) => [{ type: 'Message', id: threadId }],
    }),

    sendMessage: build.mutation<
      Message,
      { threadId: string; senderId: string; body: string; attachment?: MessageAttachment }
    >({
      query: ({ threadId, senderId, body, attachment }) => ({
        url: `/threads/${threadId}/messages`,
        method: 'POST',
        body: { senderId, body, attachment },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Message', id: arg.threadId },
        'Thread',
        'TrainerSummary',
      ],
    }),

    markThreadRead: build.mutation<Thread, { threadId: string; as: 'trainer' | 'client' }>({
      query: ({ threadId, as }) => ({ url: `/threads/${threadId}/read`, method: 'POST', body: { as } }),
      invalidatesTags: ['Thread', 'TrainerSummary'],
    }),
  }),
});

export const {
  useGetThreadsQuery,
  useGetThreadQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkThreadReadMutation,
} = messagingApi;
