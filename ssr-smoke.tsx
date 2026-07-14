// Renders every route to a string through Vite SSR — a render-phase smoke
// test for environments where the browser pane is unavailable. Not shipped.
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './src/App';
import { StoreProvider } from './src/lib/store';

const ROUTES: Array<[string, string[]]> = [
  ['/', ['Learn from a student', 'First time here?', 'pass it on']],
  ['/sessions', ['Every spot is', 'Request a topic']],
  ['/tutors', ['volunteering their time', 'Thank them']],
  ['/teach', ['open the class builder', 'Certify']],
  ['/about', ['We deleted our prices', 'schoolhouse.world']],
  ['/dashboard', ['Your dashboard']],
  ['/certificate', ['Volunteer certificate']],
  ['/admin', ['Restricted to founders']],
  ['/guide/tutor', ['Build your first class', 'The subject', 'live preview', 'draft preview']],
  ['/guide/student', ['by doing it', 'Pick your track', 'student starter guide']],
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
