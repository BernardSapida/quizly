import logger from '@/lib/logger';

export const DEFAULT_DEEP_LINK_ALLOWLIST: RegExp[] = [
  /^\/$/,
  /^\/\(app\)\/$/,
  /^\/\(app\)\/profile(\/.*)?$/,
  /^\/\(app\)\/notifications(\/[^/]+)?$/,
  /^\/\(app\)\/settings$/,
  /^\/\(app\)\/about$/,
  /^\/\(app\)\/reports$/,
  /^\/\(auth\)\/sign-in$/,
];

/**
 * Returns true when the URL path matches an entry in the allowlist.
 * Call this before storing a URL as pendingDeepLink in UIStore.
 */
export function validateDeepLink(
  url: string,
  allowlist: RegExp[] = DEFAULT_DEEP_LINK_ALLOWLIST,
): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const allowed = allowlist.some((pattern) => pattern.test(path));
    if (!allowed) {
      logger.warn('Deep link rejected: path not in allowlist', { path });
    }
    return allowed;
  } catch {
    logger.warn('Deep link rejected: invalid URL', { url });
    return false;
  }
}
