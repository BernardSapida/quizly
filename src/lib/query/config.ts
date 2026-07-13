export const STALE = {
  realtime: 0,
  high: 30_000,
  medium: 120_000,
  low: 600_000,
  static: Infinity,
} as const;

export const GC = {
  short: 300_000,
  standard: 600_000,
  long: Infinity,
} as const;
