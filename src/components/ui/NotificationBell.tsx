import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { useGetNotificationsQuery, useReadNotificationMutation } from '../../apis/notificationApi';
import { Button } from './button';
import { cn } from '../../utils/utils';
function timeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year" + (interval === 1 ? "" : "s") + " ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month" + (interval === 1 ? "" : "s") + " ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day" + (interval === 1 ? "" : "s") + " ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hour" + (interval === 1 ? "" : "s") + " ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " minute" + (interval === 1 ? "" : "s") + " ago";
  return Math.floor(seconds) + " seconds ago";
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll for notifications every 30 seconds
  const { data, isLoading } = useGetNotificationsQuery(undefined, {
    pollingInterval: 30000,
  });

  const [readNotification] = useReadNotificationMutation();

  const notifications = data?.results || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await readNotification({ notification_id: notificationId }).unwrap();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-gray-600 hover:bg-gray-100 rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
          </div>
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={cn(
                    'p-3 rounded-md text-left transition-colors relative group',
                    notification.is_read ? 'bg-white opacity-70' : 'bg-indigo-50/50'
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.notification_id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <div className="flex items-center text-xs text-gray-400 mt-2">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeAgo(new Date(notification.created))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
