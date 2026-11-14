/**
 * Same seeded database, served through a real PostgREST (no mocks), with
 * live-e2e.mjs run against it. Download PostgREST v16.5 for Windows
 * (postgrest-v16.5-windows-x86-64.zip) into this folder and extract
 * postgrest.exe and the bundled-from-Postgres-18 DLLs from
 * @embedded-postgres/windows-x64/native/bin, then:
 *
 *   node run-schema.mjs    # (required: this wipes and rebuilds pgdata)
 *   node run-e2e.mjs       # starts PostgREST on 3055, runs ../../live-e2e.mjs
 *
 * On macOS/Linux the same works with the platform's PostgREST build and the
 * DLLs aren't needed (libpq is linked statically on those builds).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import { spawn } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const DATA_DIR = path.join(HERE, 'pgdata');
const PG_PORT = Number(process.env.PG_PORT ?? 3050);
const PGRST_PORT = Number(process.env.PGRST_PORT ?? 3055);

if (!fs.existsSync(DATA_DIR)) {
  console.error('pgdata not found — run `node run-schema.mjs` first.');
  process.exit(1);
}

const pgserver = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'postgres',
  password: 'password',
  port: PG_PORT,
  persistent: true,
  autoRehydrateSymlinks: true,
  onLog: () => {},
  onError: (m) => console.error('[pg]', m?.message ?? m),
});

console.log('starting embedded postgres…');
await pgserver.start();

const config = [
  `server-port = ${PGRST_PORT}`,
  `db-uri = "postgres://authenticator:pgtestpw@127.0.0.1:${PG_PORT}/postgres"`,
  'db-schemas = "public"',
  'db-anon-role = "anon"',
  'db-extra-search-path = "public"',
  'jwt-secret = "super-secret-jwt-token-with-at-least-32-characters"',
  'admin-server-port = 3056',
].join('\n');
fs.writeFileSync(path.join(HERE, 'postgrest.conf'), config, 'utf8');

console.log('starting postgrest…');
const postgrest = spawn(process.platform === 'win32' ? 'postgrest.exe' : 'postgrest', [
  path.join(HERE, 'postgrest.conf'),
], { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'] });
postgrest.stdout.on('data', (d) => console.log('[pgrst]', d.toString().trim()));
postgrest.stderr.on('data', (d) => console.log('[pgrst]', d.toString().trim()));

let up = false;
for (let i = 0; i < 40; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PGRST_PORT}/`);
    if (res.status < 500) { up = true; break; }
  } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 500));
}
if (!up) {
  console.error('postgrest did not come up; aborting');
  postgrest.kill();
  await pgserver.stop();
  process.exit(1);
}

console.log('postgrest is up; running live-e2e.mjs…\n');
const e2e = spawn(process.execPath, ['live-e2e.mjs'], { cwd: REPO, stdio: 'inherit' });
e2e.on('exit', async (code) => {
  postgrest.kill();
  await pgserver.stop();
  console.log(`\nlive-e2e exited with code ${code}`);
  process.exit(code ?? 0);
});
