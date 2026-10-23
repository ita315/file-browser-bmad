// AD-7: folders first, then natural, case-insensitive order with a deterministic tiebreak.

import type { EntryKind } from './source.ts';

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function compareCodePoints(a: string, b: string): number {
  const ia = a[Symbol.iterator]();
  const ib = b[Symbol.iterator]();
  for (;;) {
    const ca = ia.next();
    const cb = ib.next();
    if (ca.done || cb.done) {
      return ca.done === cb.done ? 0 : ca.done ? -1 : 1;
    }
    const diff = (ca.value.codePointAt(0) ?? 0) - (cb.value.codePointAt(0) ?? 0);
    if (diff !== 0) return diff;
  }
}

export function compareEntries(
  a: { name: string; kind: EntryKind },
  b: { name: string; kind: EntryKind },
): number {
  if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
  return collator.compare(a.name, b.name) || compareCodePoints(a.name, b.name);
}
