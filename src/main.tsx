// Composition root: the only file that knows both the adapter and the UI.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createFsaSource } from './adapters/fsaSource.ts';
import { createController } from './lib/controller.ts';
import { App } from './ui/App.tsx';
import './ui/tokens.css';
import './ui/app.css';

const controller = createController(createFsaSource());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
