# Peer 2 Peer — tutoring by students

Live tutoring run by students. Group classes are always free; a teacher can offer
1-on-1 tutoring for $1–$20 a lesson, and only free classes count toward volunteer hours. Sessions cover Python, AI, web development,
math, physics, chemistry, biology, English, history, Spanish and test prep, and
subjects are added as tutors turn up who can teach them.
This replaced *Peer2Peer*, a paid tutoring app with the same tutors.

Students are 13 and older (that's a hard rule, see the privacy page in the site). Teachers are high schoolers too — Peer 2 Peer is a volunteer program, not a company.

**Concept:** knowledge as a relay baton, drawn on graph paper. Cool notebook
surfaces, blue ink, and one green accent — the baton — that always means "go /
pass it on" (live and urgent states burn rose instead). The hero's signature
piece is an animated relay chain where each learner lights up as they become
the next tutor. A "night meet" dark mode ships too — it follows your system
preference by default.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build locally
npm run smoke    # SSR-render every route and assert key content
```

Build, lint and smoke also run on every push and pull request in GitHub Actions
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), so a broken route or a
type error can't reach `main` unnoticed.

## Ship it

The build is a fully static site (hash routing, `base: './'`, self-hosted fonts),
so `dist/` deploys to any static host — but the live database needs its env vars
set on the host (see [SUPABASE.md](SUPABASE.md)):

- **Netlify** — drag `dist/` onto [app.netlify.com/drop](https://app.netlify.com/drop). Done.
- **Vercel** — `npx vercel` from the project root, then add `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` and `VITE_ADMIN_CODE` under **Settings → Environment
  Variables** and redeploy.
- **GitHub Pages** — push the repo, then either upload `dist/` to a `gh-pages`
  branch (`npx gh-pages -d dist`) or enable Pages with a Vite build action.

### Setting the founder passcode on Vercel

The console at `/#/admin` reads its passcode from `VITE_ADMIN_CODE`. A deployed
site without it keeps the console locked (`npm run dev` uses `dev`):

1. Vercel → your project → **Settings → Environment Variables**
2. Add `VITE_ADMIN_CODE` with the passcode you want, for all environments
3. **Redeploy** — Vite bakes env vars in at build time, so a redeploy is required

See [LAUNCH.md](LAUNCH.md) for the rest.

## What's inside

- **Home** — hero with the animated relay chain, live community stats, subject
  cards, the "how it works" bento, a kudos marquee, and the why-it's-free story.
- **Sessions** — searchable, filterable board of free live sessions; RSVP saves
  your spot and exports a calendar invite (.ics or Google Calendar). Full
  sessions take a waitlist, and releasing a spot auto-promotes the first person
  waiting. Live sessions get a pulsing "live now" state. Learners request +
  upvote topics. A class posted as a weekly series is one series: saving a spot
  in one week saves you for all of them (they share one room).

- **1-on-1 tutoring** — a teacher can offer private lessons for $1–$20. Students
  under 18 need a parent's email on the request, so the family is on the thread;
  the site never holds payment details.

- **Privacy & terms** — the site collects the least it can (a name, an email, an
  age, and first-party visit analytics). The plain-language version lives at
  `/#/privacy`. Under-13s can't sign up, and the team can remove their data on
  request.
- **Invite links** — "copy invite" packs an entire session into the URL
  (deflate-compressed, ~350 chars), so a link works for someone who has never
  opened Peer 2 Peer: they land on `/#/join`, see the class, and add it to their board
  in one click. This is how a serverless app still shares a schedule. There's a
  print-ready **flyer** per session too, for noticeboards.
- **Tutors** — the published roster (`src/lib/roster.ts`): each teacher's
  classes, when they're free, volunteer hours, and a "thank them" flow that posts
  to the kudos wall.
- **Teach** — the tutor path: take a certification quiz if the subject has one,
  then apply with your class name, what it covers and when you're free. The last
  step emails the team an application link that opens in the founder console.
  The whole process is in [TEACHERS.md](TEACHERS.md).
- **Interactive onboarding** — `/#/guide/student` teaches the platform by doing
  (sandbox RSVP card, real topic voting); `/#/guide/tutor` is a class-builder
  wizard that walks new tutors through naming, pitching, structuring, scheduling,
  and actually posting their first class (drafts autosave; approved tutors publish
  straight to the board).
- **Dashboard** — saved sessions, certifications, and (for tutors) live volunteer
  stats.
- **Certificate** — a printable certificate of service generated from the tutor's
  logged sessions. Hours count only classes that were free and had a student the
  teacher marked **came** — not classes someone was signed up for.
- **Meeting links** — teachers paste a Google Meet, Zoom, Teams, Jitsi or
  Discord link, plus a meeting ID and passcode if it has them. Only students
  with a seat see them. If a free call hits its time limit, the teacher pastes
  a new link from the class card and everyone in the class sees "New link".
  Teachers are prompted to turn on a waiting room so they can screen who joins.
  Teachers can also share class materials (notes, slides, worksheets) on a class
  card — one link visible only to the class, just like the meeting link.
  Students find it on the class card, at the top of their dashboard, and in a
  "your class is starting" pill that appears 15 minutes before.
- **Minimum age** — sign-up is 13+ (COPPA), enforced in the schema and the sign-in box. A teacher can also set a higher minimum age per class; younger students can't save a spot.
- **Founder console** (`/#/admin`) — a live launch checklist, application review
  (with "copy roster entry" for approved tutors), an onboarding tracker showing
  what each roster teacher still needs, site statistics, a "needs attention"
  list, every class with who signed up (including attendance marking), a student
  list (block/unblock, take someone off a class), moderation of thank-yous and
  topic requests (remove/report), teacher management including their private
  login email, session publishing, and data export/import. The passcode
  comes from `VITE_ADMIN_CODE` (see above).
- **Roles** — people pick student or tutor when they sign in. Students never see
  the Teach tab; either side can switch from their dashboard.
- **No sample data** — a new board starts with one tutor (you) and nothing else,
  so every number on the site reflects something that actually happened.

> **Publishing?** Work through [LAUNCH.md](LAUNCH.md) first — it covers the
> demo-data wipe and exactly what the no-backend model does and doesn't do.

## Tech

Vite + React + TypeScript, React Router (hash routing so it deploys to any static
host), self-hosted fonts via `@fontsource`.

**Data:** with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set, everything
lives in Supabase: sign-in by emailed code, shared classes and signups, live
link updates. Setup is in [SUPABASE.md](SUPABASE.md); the tables and the
permission rules are in [`supabase/schema.sql`](supabase/schema.sql). Without
those variables the site falls back to saving everything in each visitor's
browser, which is handy for local development. Either way pages only talk to
[`src/lib/store.tsx`](src/lib/store.tsx); the database calls are in
[`src/lib/remote.ts`](src/lib/remote.ts).

`npm run seed-sql` regenerates `supabase/seed.sql` from the roster.
`live-e2e.mjs` runs the database code against a local Postgres + PostgREST
loaded with the schema (checks every role's permissions and the parent-email,
attendance and 13+ rules).

### Making it your own

- **Config** — founder name, contact email, admin passcode: `src/lib/config.ts`.
  Bump `SEED_VERSION` to push fresh demo data to everyone.
- **The crew** — edit `ROSTER` in `src/lib/roster.ts`. See [TEACHERS.md](TEACHERS.md).
- **Quizzes** — question banks live in `src/lib/quiz-data.ts`.
- **New subjects** — add an entry to `SUBJECTS` in `src/lib/types.ts` with a name,
  blurb and hue. Filters, the class builder, sign-up and the board all pick it up
  automatically, and the colour is generated from the hue, so no CSS is needed.
  Set `hasQuiz: true` only if you also add a quiz in `src/lib/quiz-data.ts`.

> ⚠️ The admin passcode is client-side: it ships in the JS bundle, so it is a
> latch rather than a lock. On the live site that's survivable because the data
> itself is locked behind Supabase auth and row-level security — the console
> also needs a signed-in email from the `admins` table. When running offline,
> unlocking it elsewhere only ever exposes that browser's own saved board.
> Never reuse a password from anywhere else.
