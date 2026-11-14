# Local database verification

Run the real database rules — `schema.sql`, RLS, the triggers, and the full
end-to-end suite — against a throwaway Postgres on your own machine. Nothing is
installed system-wide and no admin rights are needed.

## What this replaces

`schema.sql` and `live-e2e.mjs` were written to run against a local
Postgres + PostgREST. This folder wires that up with
[embedded-postgres](https://github.com/leinelissen/embedded-postgres) (a real
Postgres 18 that needs no installation and nothing added to your PATH), plus a
small set of stand-ins for what Supabase normally provides: the `anon` and
`authenticated` roles, and `auth.jwt()`. Everything else in `schema.sql` runs
verbatim.

## One-off setup

```bash
cd scripts/local-verify
npm install          # downloads embedded-postgres (Windows/macOS/Linux x64)
```

Windows only: also download
[PostgREST v16.5](https://github.com/PostgREST/postgrest/releases/download/v16.5/postgrest-v16.5-windows-x86-64.zip),
extract `postgrest.exe` into this folder, and copy the DLLs from the
`@embedded-postgres/windows-x64/native/bin` folder in `node_modules` next to it
(it needs Postgres's `libpq.dll` and friends). macOS/Linux: put the matching
`postgrest` binary in this folder and skip the DLLs.

## Running

```bash
# 1. Verifies the schema loads, then loads it again (re-runnability), then the seed
node run-schema.mjs

# 2. Starts PostgREST, runs live-e2e.mjs against it, tears everything down
node run-e2e.mjs
```

`run-schema.mjs` wipes `pgdata/` first, so each run is clean.

`live-e2e.mjs` needs the seeded test data (already handled by
`run-schema.mjs`): the six roster teachers, and two test-only rows — an admin
(`boss@x.com`) and login emails for `abhiram@x.com` and `akil@x.com`. Those
rows are obviously fake; the data lives in the disposable `pgdata/` folder and
is deleted on every run.

## What was verified

- `schema.sql` runs cleanly **twice** in a row (this caught a real bug: it
  used to fail the second time on `profiles_age_min13`).
- `seed.sql` loads.
- `live-e2e.mjs`: **77/77 checks** pass against Postgres 18 + PostgREST 16.5,
  covering teacher/student/admin permissions, 13+ enforcement, the
  analytics cap, attendance-as-hours, meeting links, waitlists, 1-on-1, and
  class management rules.
- `supplementary-e2e.mjs` covers the newer RPCs (`errors`,
  `set_materials()`, `delete_my_account()`): anyone may insert into
  `errors` and nobody non-admin can read it; teachers post https materials;
  students can't; the 1-on-1 parent-email rule, self-deletion and
  non-self-deleting admins all behave. Current: **9/9 checks pass.**

## Not covered

- **Supabase Auth itself** (sign-in codes, SMTP). Those keys can only be
  exercised against a real Supabase project, plus whatever SMTP you use for
  email.
- **Migration path for existing databases** — `not valid` constraints
  apply to new rows without validating old ones, which is what the upgrade
  needs, but run the update after a deploy and check the SQL Editor for
  errors.
