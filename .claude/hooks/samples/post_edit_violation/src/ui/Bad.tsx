// Sample for post-edit-check.mjs: 6 violations expected (lines 5, 5, 6, 6, 7, 9).
export function Bad() {
  return (
    <div>
      <button title="Choose a folder">Open folder</button>
      <input placeholder="Search files" aria-label="Search box" />
      <img alt="Preview of the file" src="x.png" />
      <span>
        Loading…
      </span>
    </div>
  );
}
