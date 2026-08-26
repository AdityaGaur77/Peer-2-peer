// Renders every route to a string through Vite SSR — a render-phase smoke
// test for environments where the browser pane is unavailable. Not shipped.
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './src/App';
import { StoreProvider } from './src/lib/store';

const ROUTES: Array<[string, string[]]> = [
  ['/', ['Learn from a student', 'New here?', 'pass it on']],
  ['/sessions', ['Every seat is', 'Request a topic']],
  ['/tutors', ['volunteer their time', 'Thank them']],
  ['/teach', ['open the class builder', 'Take the quiz']],
  ['/about', ['I deleted the prices', 'Questions people ask']],
  ['/dashboard', ['Your dashboard']],
  ['/certificate', ['Volunteer certificate']],
  ['/admin', ['Restricted to founders']],
  ['/guide/tutor', ['Set up your first class', 'The subject', 'live preview', 'draft preview']],
  ['/guide/student', ['by trying it', 'Pick your track', 'how it works']],
  ['/join', ['invite']], // no payload → the friendly error state
  ['/flyer/nope', ['No such session']], // unknown id → graceful fallback
  ['/definitely-not-a-page', ['Dropped the']],
];

export function runSmoke() {
  const results: Array<{ route: string; ok: boolean; missing: string[]; bytes: number; error?: string }> = [];
  for (const [route, markers] of ROUTES) {
    try {
      const html = renderToString(
        <MemoryRouter initialEntries={[route]}>
          <StoreProvider>
            <App />
          </StoreProvider>
        </MemoryRouter>,
      );
      const missing = markers.filter((m) => !html.includes(m));
      results.push({ route, ok: missing.length === 0, missing, bytes: html.length });
    } catch (e) {
      results.push({ route, ok: false, missing: [], bytes: 0, error: String(e) });
    }
  }
  return results;
}
