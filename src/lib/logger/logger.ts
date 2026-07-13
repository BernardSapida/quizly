import { consoleTransport } from './transports/console.transport';
import { remoteTransport } from './transports/remote.transport';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  consoleTransport(level, message, ...args);
  if (level === 'warn' || level === 'error') {
    remoteTransport(level, message, ...args);
  }
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => log('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => log('error', message, ...args),
};

export default logger;
