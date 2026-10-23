// Inline SVG, currentColor, classes only: size and stroke width come from CSS (AD-8).

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className="tree-chevron-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={open ? 'M4 6l4 4 4-4' : 'M6 4l4 4-4 4'} />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg className="tree-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 2h4.5A1.5 1.5 0 0 1 14 6.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg className="tree-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2h5l3 3v9H4z" />
      <path d="M9 2v3h3" />
    </svg>
  );
}
