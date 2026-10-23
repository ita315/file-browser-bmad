import { describe, expect, it } from 'vitest';
import { formatDate, formatSize, formatType } from './format.ts';
import { TEXT } from './text.ts';

describe('FR-7 formatType (AC-2)', () => {
  it.each([
    ['report.pdf', 'PDF'],
    ['archive.tar.gz', 'GZ'],
    ['.env.local', 'LOCAL'],
    ['.gitignore', TEXT.unknownValue],
    ['README', TEXT.unknownValue],
    ['file.', TEXT.unknownValue],
  ])('%s → %s', (name, expected) => {
    expect(formatType(name)).toBe(expected);
  });
});

describe('FR-7 formatSize (AC-3)', () => {
  // The PRD FR-7 table, column "shown", exactly.
  it.each([
    [0, '0 B'],
    [999, '999 B'],
    [1_000, '1 KB'],
    [1_049, '1 KB'],
    [1_050, '1.1 KB'],
    [1_450, '1.5 KB'],
    [1_500, '1.5 KB'],
    [999_949, '999.9 KB'],
    [999_950, '1 MB'],
    [2_345_678, '2.3 MB'],
    [3_000_000_000, '3 GB'],
    [1_500_000_000_000, '1.5 TB'],
  ])('%d bytes → %s', (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected);
  });

  it('stays in TB above 1000 TB', () => {
    expect(formatSize(2_500_000_000_000_000)).toBe('2500 TB');
  });
});

describe('FR-7 formatDate (AC-4)', () => {
  it('formats a known time in an explicit time zone, with a regular space before PM', () => {
    const ms = Date.UTC(2026, 9, 22, 15, 20);
    const text = formatDate(ms, 'UTC');
    expect(text).toBe('Oct 22, 2026, 3:20 PM');
    expect(text).not.toContain(' ');
  });

  it('honours the time zone it is given', () => {
    expect(formatDate(Date.UTC(2026, 9, 22, 12, 20), 'Asia/Jerusalem')).toBe('Oct 22, 2026, 3:20 PM');
  });

  it('shows — for an unknown date', () => {
    expect(formatDate(null, 'UTC')).toBe(TEXT.unknownValue);
    expect(formatDate(Number.NaN, 'UTC')).toBe(TEXT.unknownValue);
  });
});
