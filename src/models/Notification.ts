export interface Notification {
  notification_id: string;
  title: string;
  message: string;
  payload: Record<string, any>;
  is_read: boolean;
  created: string;
  modified: string;
}

export interface WebPushSubscribeRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  browser: string;
}

export interface WebPushKeysResponse {
  vapid_public_key: string;
}
