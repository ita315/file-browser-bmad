// File kinds by extension only, never by the browser-reported MIME type
// (.claude/rules/file-type-by-extension.md). One table. A new kind touches: its entries
// here and a member of `FilePreview`; a `PreviewView` variant and its branch in
// `settledView` (selectors.ts); and one case in PreviewPane.

export type FilePreview = { readonly kind: 'image'; readonly mime: string };

const PREVIEWS: ReadonlyMap<string, FilePreview> = new Map([
  ['png', { kind: 'image', mime: 'image/png' }],
  ['jpg', { kind: 'image', mime: 'image/jpeg' }],
  ['jpeg', { kind: 'image', mime: 'image/jpeg' }],
  ['gif', { kind: 'image', mime: 'image/gif' }],
  ['webp', { kind: 'image', mime: 'image/webp' }],
  ['avif', { kind: 'image', mime: 'image/avif' }],
  ['svg', { kind: 'image', mime: 'image/svg+xml' }],
]);

/** Lower-cased text after the last dot; '' with no dot or a dot first (same rule as formatType). */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** How a file with this name is previewed, or null when it has no preview. */
export function previewOf(name: string): FilePreview | null {
  return PREVIEWS.get(extensionOf(name)) ?? null;
}
