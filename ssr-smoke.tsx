// Renders every route to a string through Vite SSR — a render-phase smoke
// test for environments where the browser pane is unavailable. Not shipped.
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './src/App';
import { StoreProvider } from './src/lib/store';

const ROUTES: Array<[string, string[]]> = [
  ['/', ['Free tutoring from high school students', 'First time here?', 'What you can learn', 'English &amp; Writing', 'For parents']],
  ['/sessions', ['Classes', 'Request a topic']],
  ['/tutors', ['Our teachers', 'Thank them', 'Ayden J.', 'Foundational English Skills', 'Grade 10']],
  ['/teach', ['Teach a class', 'Set up my class', 'What would you call your class?']],
  ['/about', ['About Peer 2 Peer', 'Questions people ask']],
  ['/dashboard', ['Your dashboard']],
  ['/certificate', ['Volunteer certificate']],
  ['/admin', ['Team login']],
  ['/dashboard?x=1', ['Your dashboard', 'Sign in to see']],
  ['/guide/tutor', ['Set up your class', 'The subject', 'live preview', 'draft preview']],
  ['/guide/student', ['How Peer 2 Peer works', 'Pick your track']],
  ['/join', ['invite']], // no payload → the friendly error state
  ['/flyer/nope', ['No such session']], // unknown id → graceful fallback
  ['/definitely-not-a-page', ['Page not found']],
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
