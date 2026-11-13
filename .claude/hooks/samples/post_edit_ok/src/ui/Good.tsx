// Sample for post-edit-check.mjs: nothing here should be reported.
const TEXT = { open: 'Open folder', search: 'Search files' };

export function Good({ name }: { name: string }) {
  return (
    <div>
      <button title={TEXT.open}>{TEXT.open}</button>
      <input placeholder={TEXT.search} aria-label={TEXT.search} />
      <img alt="" src="x.png" />
      <span>{name}</span>
      <span>&nbsp;</span>
      <svg viewBox="0 0 16 16" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h12" />
      </svg>
    </div>
  );
}
