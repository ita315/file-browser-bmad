import { describe, expect, it } from 'vitest';
import { extensionOf, previewOf } from './fileKinds.ts';

describe('extensionOf', () => {
  it.each([
    ['photo.JPG', 'jpg'],
    ['archive.tar.gz', 'gz'],
    ['.png', ''],
    ['README', ''],
    ['trailing.', ''],
    ['', ''],
  ])('%s → %s', (name, ext) => {
    expect(extensionOf(name)).toBe(ext);
  });
});

describe('previewOf', () => {
  it.each([
    ['photo.JPG', 'image/jpeg'],
    ['a.jpeg', 'image/jpeg'],
    ['a.png', 'image/png'],
    ['a.gif', 'image/gif'],
    ['a.WebP', 'image/webp'],
    ['a.avif', 'image/avif'],
    ['logo.svg', 'image/svg+xml'],
  ])('%s is an image (%s)', (name, mime) => {
    expect(previewOf(name)).toEqual({ kind: 'image', mime });
  });

  it.each(['notes.txt', '.png', 'png', 'a.ts', 'a.constructor', 'a.toString', 'folder'])('%s has no preview', (name) => {
    expect(previewOf(name)).toBeNull();
  });
});
