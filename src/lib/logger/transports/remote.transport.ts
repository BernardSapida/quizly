export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Placeholder — wire up Sentry or Datadog here
export function remoteTransport(_level: LogLevel, _message: string, ..._args: unknown[]): void {
  // noop until remote logging service is configured
}
