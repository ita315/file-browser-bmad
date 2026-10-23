import { describe, expect, it } from 'vitest';
import { compareEntries } from './sort.ts';
import type { EntryKind } from './source.ts';

const sortNames = (items: Array<[string, EntryKind]>) =>
  items
    .map(([name, kind]) => ({ name, kind }))
    .sort(compareEntries)
    .map((e) => e.name);

describe('FR-4 compareEntries', () => {
  it('puts folders before files, including hidden folders', () => {
    expect(sortNames([['b', 'file'], ['.git', 'directory'], ['a', 'file'], ['src', 'directory']])).toEqual([
      '.git',
      'src',
      'a',
      'b',
    ]);
  });

  it('sorts case-insensitively', () => {
    expect(sortNames([['b', 'file'], ['A', 'file'], ['c', 'file']])).toEqual(['A', 'b', 'c']);
  });

  it('sorts numbers naturally', () => {
    expect(sortNames([['file10', 'file'], ['file2', 'file'], ['file1', 'file']])).toEqual([
      'file1',
      'file2',
      'file10',
    ]);
  });

  it('breaks ties by code point, whatever the input order', () => {
    expect(sortNames([['readme', 'file'], ['README', 'file']])).toEqual(['README', 'readme']);
    expect(sortNames([['README', 'file'], ['readme', 'file']])).toEqual(['README', 'readme']);
  });

  it('returns 0 only for identical names', () => {
    expect(compareEntries({ name: 'x', kind: 'file' }, { name: 'x', kind: 'file' })).toBe(0);
  });
});
