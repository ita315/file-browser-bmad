import type { DetailsView } from '../lib/selectors.ts';
import { TEXT } from '../lib/text.ts';

export function DetailsPanel({ view }: { view: DetailsView }) {
  switch (view.type) {
    case 'empty':
      return (
        <section className="details-panel">
          <p className="details-empty">{TEXT.selectFilePrompt}</p>
        </section>
      );
  }
}
