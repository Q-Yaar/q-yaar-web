import { useCallback, useMemo, useState } from 'react';
import { useGetNotificationsQuery, useReadAllNotificationsMutation, useReadNotificationMutation } from '../../../apis/notificationApi';
import { NotificationsSheetProps } from '../components/NotificationsSheet';

const POLL_INTERVAL_MS = 30000;

export interface UseNotificationsResult {
  /** Spread directly onto <NotificationsSheet>. */
  props: NotificationsSheetProps;
  openSheet: () => void;
  /** For TopBar's bell badge. */
  unreadCount: number;
}

/**
 * The same real notifications API the game's home page bell already uses
 * (src/components/ui/NotificationBell.tsx, src/apis/notificationApi.ts),
 * just surfaced as a MapV2-styled BottomSheet instead of an anchored
 * dropdown — there's no dedicated notifications page/route to link to
 * (confirmed: the home page's bell renders everything inline too), and a
 * dropdown wouldn't fit MapV2's floating, full-bleed map chrome the way it
 * does docked under a normal page header. Same 30s poll as everywhere else
 * in this app that shows "live" data without a push channel.
 */
export function useNotifications(): UseNotificationsResult {
  const { data } = useGetNotificationsQuery(undefined, { pollingInterval: POLL_INTERVAL_MS });
  const [readNotification] = useReadNotificationMutation();
  const [readAllNotifications, { isLoading: markingAllRead }] = useReadAllNotificationsMutation();

  const [isOpen, setIsOpen] = useState(false);

  const notifications = useMemo(() => data?.results ?? [], [data]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const openSheet = useCallback(() => setIsOpen(true), []);
  const closeSheet = useCallback(() => setIsOpen(false), []);

  const onMarkRead = useCallback((notificationId: string) => {
    readNotification({ notification_id: notificationId })
      .unwrap()
      .catch((err) => {
        console.warn('[MapV2] Failed to mark notification read', err);
      });
  }, [readNotification]);

  const onMarkAllRead = useCallback(() => {
    readAllNotifications()
      .unwrap()
      .catch((err) => {
        console.warn('[MapV2] Failed to mark all notifications read', err);
      });
  }, [readAllNotifications]);

  const props: NotificationsSheetProps = {
    isOpen,
    onClose: closeSheet,
    notifications,
    onMarkRead,
    onMarkAllRead,
    markingAllRead,
    unreadCount,
  };

  return { props, openSheet, unreadCount };
}
