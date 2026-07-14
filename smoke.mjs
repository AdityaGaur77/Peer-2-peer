// Node harness: shims the few browser APIs touched during the render phase,
// then SSR-renders every route via Vite's module runner.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
globalThis.sessionStorage = { ...globalThis.localStorage };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.document = { documentElement: { dataset: { theme: 'light' } }, querySelector: () => null };
if (!globalThis.window) globalThis.window = globalThis;

const { createServer } = await import('vite');
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const { runSmoke } = await server.ssrLoadModule('/ssr-smoke.tsx');
  const results = runSmoke();
  for (const r of results) {
    console.log(
      `${r.ok ? 'PASS' : 'FAIL'}  ${r.route.padEnd(26)} ${r.bytes}b` +
        (r.missing.length ? `  missing: ${r.missing.join(' | ')}` : '') +
        (r.error ? `  ERROR: ${r.error.slice(0, 200)}` : ''),
    );
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? 'ALL ROUTES RENDER CLEAN' : `${failed} ROUTE(S) FAILED`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await server.close();
}
