import { useEffect, useState } from 'react';
import type { PreviewView } from '../lib/selectors.ts';
import { TEXT } from '../lib/text.ts';

function PreviewMessage({ text }: { text: string }) {
  return <p className="preview-message status-row-text">{text}</p>;
}

/** What the visible column shows: a decoded object URL, or the message (url null). */
type Shown = { readonly url: string | null };

const MESSAGE: Shown = { url: null };

/**
 * Only ever an <img>, so script inside an svg never runs. The MIME comes from the
 * extension, not the browser. Stays mounted across image↔unavailable, so what is on
 * screen stays until the next image is decoded off screen and then swaps in at once.
 * `blob` null: the read failed. `held`: previous content kept while the next one
 * loads; shown as is, nothing new is decoded for it.
 */
function ImagePreview({ blob, mime, held }: { blob: Blob | null; mime: string; held: boolean }) {
  const [shown, setShown] = useState<Shown | null>(null);

  // A failed read replaces what is on screen right away (state adjusted while rendering).
  if (blob === null && shown?.url !== null) setShown(MESSAGE);

  useEffect(() => {
    if (blob === null || held) return;
    let cancelled = false;
    const url = URL.createObjectURL(new Blob([blob], { type: mime }));
    const probe = new Image();
    probe.src = url;
    probe.decode().then(
      () => {
        if (cancelled) URL.revokeObjectURL(url);
        else setShown({ url });
      },
      () => {
        URL.revokeObjectURL(url);
        if (!cancelled) setShown(MESSAGE);
      },
    );
    // A decode that ends after a change is dropped (and its URL freed above).
    return () => {
      cancelled = true;
    };
  }, [blob, mime, held]);

  // The URL on screen is freed once it is replaced, or when the column goes away.
  const url = shown?.url ?? null;
  useEffect(() => {
    if (url === null) return;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  if (blob === null || shown?.url === null) return <PreviewMessage text={TEXT.unableToDisplay} />;
  if (url === null) return <PreviewMessage text={TEXT.loading} />;
  return <img className="preview-image" alt="" src={url} onError={() => setShown(MESSAGE)} />;
}

export function PreviewPane({ view }: { view: PreviewView }) {
  switch (view.type) {
    case 'none':
      return null;
    case 'loading':
      return (
        <section className="preview-pane">
          <PreviewMessage text={TEXT.loading} />
        </section>
      );
    // One element for both, so the image stays mounted between them.
    case 'image':
    case 'unavailable':
      return (
        <section className="preview-pane">
          <ImagePreview
            blob={view.type === 'image' ? view.blob : null}
            mime={view.type === 'image' ? view.mime : ''}
            held={view.type === 'image' && view.held}
          />
        </section>
      );
  }
}
