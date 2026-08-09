import { api } from './api';
import { NOTIFICATIONS_API } from '../constants/api-endpoints';
import { NOTIFICATIONS_MODULE } from '../constants/modules';
import { Notification, WebPushSubscribeRequest, WebPushKeysResponse } from '../models/Notification';

export interface ListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const notificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<ListResponse<Notification>, void>({
      query: () => ({
        url: NOTIFICATIONS_API,
        method: 'GET',
      }),
      providesTags: [NOTIFICATIONS_MODULE],
    }),
    subscribeWebPush: builder.mutation<{ status: string }, WebPushSubscribeRequest>({
      query: (body) => ({
        url: `${NOTIFICATIONS_API}webpush/subscribe`,
        method: 'POST',
        body,
      }),
    }),
    getWebPushKeys: builder.query<WebPushKeysResponse, void>({
      query: () => ({
        url: `${NOTIFICATIONS_API}webpush/keys`,
        method: 'GET',
      }),
    }),
    readNotification: builder.mutation<void, { notification_id: string }>({
      query: ({ notification_id }) => ({
        url: `${NOTIFICATIONS_API}${notification_id}/read`,
        method: 'POST',
      }),
      invalidatesTags: [NOTIFICATIONS_MODULE],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useSubscribeWebPushMutation,
  useGetWebPushKeysQuery,
  useReadNotificationMutation,
} = notificationApi;
