export type NotificationChannel = 'in_app' | 'email' | 'push' | 'desktop';

export interface NotificationAdapter {
  channel: NotificationChannel;
  send(input: {
    userId: string;
    title: string;
    body: string;
    href?: string;
  }): Promise<{ delivered: boolean; mock: boolean }>;
}

/** Safe mock adapters — no external credentials required. */
export const mockEmailAdapter: NotificationAdapter = {
  channel: 'email',
  async send(input) {
    console.info('[mock:email]', input.userId, input.title);
    return { delivered: true, mock: true };
  },
};

export const mockPushAdapter: NotificationAdapter = {
  channel: 'push',
  async send(input) {
    console.info('[mock:push]', input.userId, input.title);
    return { delivered: true, mock: true };
  },
};

export const mockDesktopAdapter: NotificationAdapter = {
  channel: 'desktop',
  async send(input) {
    console.info('[mock:desktop]', input.userId, input.title);
    return { delivered: true, mock: true };
  },
};

export function getNotificationAdapters(): NotificationAdapter[] {
  return [mockEmailAdapter, mockPushAdapter, mockDesktopAdapter];
}
