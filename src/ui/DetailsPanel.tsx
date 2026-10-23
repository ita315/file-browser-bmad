import type { ReactNode } from 'react';
import type { DetailsView } from '../lib/selectors.ts';
import { TEXT } from '../lib/text.ts';

function DetailsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="details-row">
      <dt className="details-label">{label}</dt>
      <dd className="details-value">{children}</dd>
    </div>
  );
}

function NameRow({ name }: { name: string }) {
  return (
    <DetailsRow label={TEXT.labelName}>
      <span className="details-name bidi-isolate" dir="ltr">
        {name}
      </span>
    </DetailsRow>
  );
}

export function DetailsPanel({ view }: { view: DetailsView }) {
  switch (view.type) {
    case 'empty':
      return (
        <section className="details-panel">
          <p className="details-empty">{TEXT.selectFilePrompt}</p>
        </section>
      );
    case 'loading':
      return (
        <section className="details-panel">
          <dl className="details-list">
            <NameRow name={view.name} />
          </dl>
          <p className="details-loading status-row-text">{TEXT.loading}</p>
        </section>
      );
    case 'file':
      return (
        <section className="details-panel">
          <dl className="details-list">
            <NameRow name={view.name} />
            <DetailsRow label={TEXT.labelType}>{view.typeLabel}</DetailsRow>
            <DetailsRow label={TEXT.labelSize}>{view.size}</DetailsRow>
            <DetailsRow label={TEXT.labelModified}>{view.modified}</DetailsRow>
          </dl>
        </section>
      );
    case 'folder':
      return (
        <section className="details-panel">
          <dl className="details-list">
            <NameRow name={view.name} />
            <DetailsRow label={TEXT.labelType}>{TEXT.typeFolder}</DetailsRow>
          </dl>
        </section>
      );
  }
}
