import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/instrument-serif';
import '@fontsource-variable/jetbrains-mono';
import './styles/global.css';

import App from './App.tsx';
import { StoreProvider } from './lib/store.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
);
