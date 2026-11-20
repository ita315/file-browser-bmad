import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { createController } from '../lib/controller.ts';
import { TEXT } from '../lib/text.ts';
import { createFakeSource, dir, file } from '../test/fakeSource.ts';
import { App } from './App.tsx';

afterEach(() => {
  cleanup();
});

const LARGE = 'Large';

async function setup() {
  const source = createFakeSource();
  const controller = createController(source);
  source.queuePick(
    'project',
    dir({
      'just-under.bin': file({ size: 9_999_999 }),
      'exactly-limit.bin': file({ size: 10_000_000 }),
      'huge.bin': file({ size: 25_000_000 }),
      'folder-x': dir(),
    }),
  );
  const view = render(<App controller={controller} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: TEXT.openFolder }));
  await screen.findByText('huge.bin');
  return { ...view, user };
}

function nameButton(container: HTMLElement, name: string): HTMLElement {
  const row = [...container.querySelectorAll<HTMLElement>('.tree-row')].find(
    (r) => r.querySelector('.tree-name')?.textContent === name,
  );
  if (!row) throw new Error(`no row ${name}`);
  return row.querySelector('.tree-name-button') as HTMLElement;
}

function detailsPanel(container: HTMLElement): HTMLElement {
  return container.querySelector('.details-panel') as HTMLElement;
}

describe('Large badge in the details panel', () => {
  it('does not show Large for a file of 9,999,999 bytes', async () => {
    const { container, user } = await setup();
    await user.click(nameButton(container, 'just-under.bin'));
    await screen.findByText(TEXT.labelSize);
    expect(within(detailsPanel(container)).queryByText(LARGE)).toBeNull();
  });

  it('shows Large for a file of exactly 10,000,000 bytes', async () => {
    const { container, user } = await setup();
    await user.click(nameButton(container, 'exactly-limit.bin'));
    await screen.findByText(TEXT.labelSize);
    expect(within(detailsPanel(container)).queryByText(LARGE)).not.toBeNull();
  });

  it('shows Large for a file of 25,000,000 bytes', async () => {
    const { container, user } = await setup();
    await user.click(nameButton(container, 'huge.bin'));
    await screen.findByText(TEXT.labelSize);
    expect(within(detailsPanel(container)).queryByText(LARGE)).not.toBeNull();
  });

  it('does not show Large for a folder', async () => {
    const { container, user } = await setup();
    await user.click(nameButton(container, 'folder-x'));
    await screen.findByText(TEXT.typeFolder);
    expect(within(detailsPanel(container)).queryByText(LARGE)).toBeNull();
  });
});
