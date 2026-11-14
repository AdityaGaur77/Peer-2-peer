/**
 * Start a real Postgres 18, apply Supabase-style shims (roles, auth.jwt(),
 * grants — what Supabase gives you for free), then load the project's schema
 * twice (proving re-runnability) and the seed. Works on Windows; no admin
 * rights, no Docker, nothing installed system-wide.
 *
 * Run from this folder:
 *   npm install            # one-off
 *   node run-schema.mjs    # checks the schema twice + seed
 *   node run-e2e.mjs       # schema + PostgREST + live-e2e.mjs, then cleans up
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const DATA_DIR = path.join(HERE, 'pgdata');
const PG_PORT = Number(process.env.PG_PORT ?? 3050);
const SCHEMA = path.join(REPO, 'supabase', 'schema.sql');
const SEED = path.join(REPO, 'supabase', 'seed.sql');

console.log('Supabase shim for a vanilla Postgres (roles anon/authenticated, auth.jwt(), grants)…');
const SHIM = `
create role authenticator noinherit login password 'pgtestpw';
create role anon nologin;
create role authenticated nologin;
grant anon, authenticated to authenticator;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
create schema if not exists auth;
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb
$$;
grant usage on schema auth to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
`;

fs.rmSync(DATA_DIR, { recursive: true, force: true });

const pgserver = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'postgres',
  password: 'password',
  port: PG_PORT,
  persistent: true,
  autoRehydrateSymlinks: true,
  initdbFlags: ['-E', 'UTF8', '--locale=C'],
  onLog: () => {},
  onError: () => {},
});

console.log('starting embedded postgres…');
await pgserver.initialise();
await pgserver.start();

const client = new pg.Client({ host: '127.0.0.1', port: PG_PORT, user: 'postgres', password: 'password', database: 'postgres' });
await client.connect();
await client.query(SHIM);
console.log('OK   shim (roles, auth.jwt, grants)');

let failed = false;
for (const [label, file] of [
  ['schema.sql (first run)', SCHEMA],
  ['schema.sql (SECOND RUN — re-runnability)', SCHEMA],
  ['seed.sql', SEED],
]) {
  try {
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log(`OK   ${label}`);
  } catch (e) {
    console.error(`FAIL ${label}: ${e.message}`);
    failed = true;
  }
}

await client.query("insert into public.admins (email) values ('boss@x.com') on conflict (email) do nothing");
await client.query("insert into public.tutor_emails (tutor_id, email) values ('roster-abhiram', 'abhiram@x.com'), ('roster-akil', 'akil@x.com') on conflict (tutor_id) do nothing");
console.log('OK   test-only rows: admin boss@x.com and teacher login emails (wipe pgdata to remove)');

const state = await client.query("select count(*)::int as tutors from public.tutors");
console.log(`OK   seeded teachers: ${state.rows[0].tutors}`);

await client.end();
await pgserver.stop();
process.exit(failed ? 1 : 0);
