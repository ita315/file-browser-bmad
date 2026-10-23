// FR-7 formats (AD-7): pure, locale-independent. Components receive the ready strings.

import { TEXT } from './text.ts';

/** The text after the last dot, upper-cased; `—` with no dot or a dot first or last. */
export function formatType(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return TEXT.unknownValue;
  return name.slice(dot + 1).toUpperCase();
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Decimal units, at most one decimal, round half up, no `.0`, rollover at 1000, capped at TB.
 * Works in tenths (PRD addendum): `Math.round(bytes * 10 / unit)`, never `toFixed`.
 */
export function formatSize(bytes: number): string {
  let index = 0;
  let unit = 1;
  let tenths = Math.round((bytes * 10) / unit);
  while (tenths >= 10000 && index < SIZE_UNITS.length - 1) {
    index += 1;
    unit *= 1000;
    tenths = Math.round((bytes * 10) / unit);
  }
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  const value = decimal === 0 ? String(whole) : `${whole}.${decimal}`;
  return `${value} ${SIZE_UNITS[index]}`;
}

/** `Oct 22, 2026, 3:20 PM` with a regular space before AM/PM; `—` when unknown. */
export function formatDate(ms: number | null, timeZone?: string): string {
  if (ms === null || !Number.isFinite(ms)) return TEXT.unknownValue;
  const text = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(ms);
  return text.replace(/ /g, ' ');
}
