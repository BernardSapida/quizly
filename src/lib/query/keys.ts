export const keys = {
  auth: {
    session: () => ['auth', 'session'] as const,
    me: () => ['auth', 'me'] as const,
  },
  appConfig: {
    root: () => ['appConfig'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    unread: () => ['notifications', 'unread'] as const,
  },
} as const;
