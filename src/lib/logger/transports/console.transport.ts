export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function consoleTransport(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${level.toUpperCase()}]`, message, ...args);
}
