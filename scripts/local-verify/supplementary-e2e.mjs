/**
 * Spot-checks the security properties of the RPCs and tables live-e2e doesn't
 * cover: public.errors (anyone may insert; nobody non-admin can read),
 * set_materials() (teacher/admin-only, https-only), and delete_my_account()
 * (removes profile/signups/1-on-1 requests; admins can't self-delete).
 *
 * Run AFTER `node run-schema.mjs` — needs the seeded test data.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, 'pgdata');
const PG_PORT = Number(process.env.PG_PORT ?? 3050);
const client = new pg.Client({ host: '127.0.0.1', port: PG_PORT, user: 'postgres', password: 'password', database: 'postgres' });

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
  if (!ok) fails++;
};

const q = async (sql, ...params) => (await client.query(sql, params)).rows;

/** Run fn as a JWT role inside a transaction, rolled back afterwards. */
const as = async (role, claims, fn) => {
  await client.query('begin');
  await client.query(`set local role ${role}`);
  await client.query(`set local request.jwt.claims = '${JSON.stringify(claims).replace(/'/g, "''")}'`);
  try {
    await fn();
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
  await client.query('rollback');
};

const main = async () => {
  const pgserver = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: 'postgres', password: 'password',
    port: PG_PORT, persistent: true, autoRehydrateSymlinks: true,
    onLog: () => {}, onError: () => {},
  });
  await pgserver.start();
  await client.connect();

  await client.query("insert into public.sessions (id, title, subject, tutor_id, start_at, duration_min, capacity) values ('supplementary_sess', 'Extra help', 'math', 'roster-akil', now() + interval '7 days', 60, 5) on conflict (id) do nothing");

  await as('authenticated', { role: 'authenticated', email: 'akil@x.com' }, async () => {
    await q("select public.set_materials('supplementary_sess', 'https://example.com/notes')");
    const rooms = await q("select materials from public.session_rooms where session_id = 'supplementary_sess'");
    check('teacher posts class materials', rooms[0]?.materials === 'https://example.com/notes');
  });

  await as('authenticated', { role: 'authenticated', email: 'akil@x.com' }, async () => {
    let refused = false;
    try {
      await q("select public.set_materials('supplementary_sess', 'not a url')");
    } catch (e) { refused = /https/i.test(e.message); }
    check('non-https materials link is refused', refused);
  });

  await as('authenticated', { role: 'authenticated', email: 'sam@x.com' }, async () => {
    let refused = false;
    try {
      await q("select public.set_materials('supplementary_sess', 'https://example.com/hijack')");
    } catch (e) { refused = /teacher running the class/i.test(e.message); }
    check('student cannot post class materials', refused);
  });

  // errors: anyone can insert (a crash can happen pre-signin), nobody non-admin can read
  {
    await client.query('begin');
    await client.query('set local role anon');
    await client.query(`set local request.jwt.claims = '{"role":"anon"}'`);
    await q("insert into public.errors (message) values ('Boom from supplementary')");
    const rows = await q('select count(*)::int as n from public.errors');
    check('visitor cannot read errors', rows[0]?.n === 0);
    await client.query('commit');
  }
  await as('authenticated', { role: 'authenticated', email: 'sam@x.com' }, async () => {
    const rows = await q('select count(*)::int as n from public.errors');
    check('non-admin student cannot read errors', rows[0]?.n === 0);
  });
  await as('authenticated', { role: 'authenticated', email: 'boss@x.com' }, async () => {
    const rows = await q("select message from public.errors where message = 'Boom from supplementary' limit 1");
    check('admin can read errors', rows.length >= 1);
  });

  // account deletion: created as Zoë so the row persists, then committed delete
  await client.query("insert into public.profiles (email, name, age, role) values ('zoe@x.com', 'Zoe', 16, 'student') on conflict (email) do nothing");
  {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query(`set local request.jwt.claims = '{"role":"authenticated","email":"zoe@x.com"}'`);
    await q("insert into public.signups (session_id, email, name) values ('supplementary_sess', 'zoe@x.com', 'Zoe') on conflict (session_id, email) do nothing");
    await client.query('commit');
  }
  {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query(`set local request.jwt.claims = '{"role":"authenticated","email":"zoe@x.com"}'`);
    await q('select public.delete_my_account()');
    await client.query('commit');
  }
  const zoe = await client.query("select count(*)::int as n from public.profiles where email = 'zoe@x.com'");
  const zoeSignups = await client.query("select count(*)::int as n from public.signups where email = 'zoe@x.com'");
  check('profile is gone after self-delete', zoe.rows[0].n === 0);
  check('signups are gone after self-delete', zoeSignups.rows[0].n === 0);

  await as('authenticated', { role: 'authenticated', email: 'boss@x.com' }, async () => {
    let refused = false;
    try {
      await q('select public.delete_my_account()');
    } catch (e) { refused = /team accounts/i.test(e.message); }
    check('team admin cannot self-delete', refused);
  });

  await client.query("delete from public.session_rooms where session_id = 'supplementary_sess'");
  await client.query("delete from public.signups where session_id = 'supplementary_sess'");
  await client.query("delete from public.sessions where id = 'supplementary_sess'");

  await client.end();
  await pgserver.stop();
  console.log(fails === 0 ? '\nALL SUPPLEMENTARY CHECKS PASS' : `\n${fails} SUPPLEMENTARY CHECK(S) FAILED`);
  process.exit(fails ? 1 : 0);
};

main().catch((e) => { console.error('ABORTED:', e); process.exit(1); });
