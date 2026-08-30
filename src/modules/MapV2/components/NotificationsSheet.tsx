import React from 'react';
import { Check } from 'lucide-react';
import { Notification } from '../../../models/Notification';
import { formatLastSeen } from '../../../utils/formatTime';
import { BottomSheet } from './BottomSheet';

export interface NotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  markingAllRead: boolean;
  unreadCount: number;
}

/**
 * MapV2's notifications list — the same real data the game home page's
 * bell (src/components/ui/NotificationBell.tsx) shows, just as a
 * BottomSheet instead of an anchored dropdown, matching every other MapV2
 * flow. Tapping an unread notification marks just that one read; "Mark all
 * read" (header action, only shown when there's something unread) clears
 * the rest in one call.
 */
export const NotificationsSheet: React.FC<NotificationsSheetProps> = ({
  isOpen, onClose, notifications, onMarkRead, onMarkAllRead, markingAllRead, unreadCount,
}) => (
  <BottomSheet
    isOpen={isOpen}
    title="Notifications"
    leftAction={{ label: 'Close', onClick: onClose }}
    rightAction={unreadCount > 0 ? { label: markingAllRead ? 'Marking…' : 'Mark all read', onClick: onMarkAllRead, disabled: markingAllRead } : undefined}
  >
    {notifications.length === 0 ? (
      <p className="text-[11px] text-white/40">No notifications yet.</p>
    ) : (
      <div className="space-y-1.5">
        {notifications.map((n) => (
          <button
            key={n.notification_id}
            onClick={() => !n.is_read && onMarkRead(n.notification_id)}
            className={`w-full flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
              n.is_read ? 'border-white/10 opacity-60' : 'border-white/20 bg-white/5 hover:border-white/30'
            }`}
          >
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-white">{n.title}</span>
              <span className="block text-[11px] text-white/50 mt-0.5">{n.message}</span>
              <span className="block text-[10px] text-white/30 mt-1">{formatLastSeen(n.created)}</span>
            </span>
            {n.is_read ? (
              <Check className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#4F91FF] shrink-0 mt-1.5" />
            )}
          </button>
        ))}
      </div>
    )}
  </BottomSheet>
);
