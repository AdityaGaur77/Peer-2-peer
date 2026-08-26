# Relay — free peer-to-peer tutoring

Free live tutoring run by students. Sessions cover Python, AI, web development,
math, physics, chemistry, biology, English, history, Spanish and test prep, and
subjects are added as tutors turn up who can teach them. Nobody pays anything.
This replaced *Peer2Peer*, a paid tutoring app with the same tutors.

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

## Ship it

The build is a fully static site (hash routing, `base: './'`, self-hosted fonts),
so `dist/` deploys to any static host with zero config:

- **Netlify** — drag `dist/` onto [app.netlify.com/drop](https://app.netlify.com/drop). Done.
- **Vercel** — `npx vercel` from the project root (framework auto-detects Vite).
- **GitHub Pages** — push the repo, then either upload `dist/` to a `gh-pages`
  branch (`npx gh-pages -d dist`) or enable Pages with a Vite build action.

### Setting the founder passcode on Vercel

The console at `/#/admin` reads its passcode from `VITE_ADMIN_CODE`:

1. Vercel → your project → **Settings → Environment Variables**
2. Add `VITE_ADMIN_CODE` with the passcode you want, for all environments
3. **Redeploy** — Vite bakes env vars in at build time, so a redeploy is required

Without that variable the app falls back to the value in
[`src/lib/config.ts`](src/lib/config.ts), which is visible to anyone reading the
repo. See [LAUNCH.md](LAUNCH.md) for the rest.

## What's inside

- **Home** — hero with the animated relay chain, live community stats, subject
  cards, the "how it works" bento, a kudos marquee, and the why-it's-free story.
- **Sessions** — searchable, filterable board of free live sessions; RSVP saves
  your spot and exports a calendar invite (.ics or Google Calendar). Full
  sessions take a waitlist, and releasing a spot auto-promotes the first person
  waiting. Live sessions get a pulsing "live now" state. Learners request +
  upvote topics.
- **Invite links** — "copy invite" packs an entire session into the URL
  (deflate-compressed, ~350 chars), so a link works for someone who has never
  opened Relay: they land on `/#/join`, see the class, and add it to their board
  in one click. This is how a serverless app still shares a schedule. There's a
  print-ready **flyer** per session too, for noticeboards.
- **Tutors** — the founding crew, their volunteer hours, and a "thank them" flow
  that posts to the kudos wall.
- **Teach** — the two-step tutor path: pass a certification quiz (options shuffle
  each attempt), then apply. Unlimited retakes.
- **Interactive onboarding** — `/#/guide/student` teaches the platform by doing
  (sandbox RSVP card, real topic voting); `/#/guide/tutor` is a class-builder
  wizard that walks new tutors through naming, pitching, structuring, scheduling,
  and actually posting their first class (drafts autosave; approved tutors publish
  straight to the board).
- **Dashboard** — saved sessions, certifications, and (for tutors) live volunteer
  stats.
- **Certificate** — a printable certificate of service generated from the tutor's
  logged sessions.
- **Founder console** (`/#/admin`) — a live launch checklist, application review,
  tutor management, session publishing, and data export/import. The passcode
  comes from `VITE_ADMIN_CODE` (see above).
- **Roles** — people pick student or tutor when they sign in. Students never see
  the Teach tab; either side can switch from their dashboard.
- **No sample data** — a new board starts with one tutor (you) and nothing else,
  so every number on the site reflects something that actually happened.

> **Publishing?** Work through [LAUNCH.md](LAUNCH.md) first — it covers the
> demo-data wipe and exactly what the no-backend model does and doesn't do.

## Tech

Vite + React + TypeScript, React Router (hash routing so it deploys to any static
host), self-hosted fonts via `@fontsource`. **No backend** — all state lives in
`localStorage` (see [`src/lib/store.tsx`](src/lib/store.tsx)) and reseeds from
[`src/lib/seed.ts`](src/lib/seed.ts). That's deliberate for a pilot: it runs
anywhere with zero setup. Moving to real accounts/data means swapping the store's
implementation for API calls — the component layer doesn't change.

### Making it your own

- **Config** — founder name, contact email, admin passcode: `src/lib/config.ts`.
  Bump `SEED_VERSION` to push fresh demo data to everyone.
- **The crew** — edit `TUTOR_SEEDS` in `src/lib/seed.ts`, or just approve real
  applications from the founder console.
- **Quizzes** — question banks live in `src/lib/quiz-data.ts`.
- **New subjects** — add an entry to `SUBJECTS` in `src/lib/types.ts` with a name,
  blurb and hue. Filters, the class builder, sign-up and the board all pick it up
  automatically, and the colour is generated from the hue, so no CSS is needed.
  Set `hasQuiz: true` only if you also add a quiz in `src/lib/quiz-data.ts`.

> ⚠️ The admin passcode is client-side: it ships in the JS bundle and lives in
> this repo, so it is a latch rather than a lock. That is survivable here because
> every visitor gets their own `localStorage` copy of the board — unlocking the
> console elsewhere only ever exposes that person's own data, never yours. Never
> reuse a password from anywhere else, and add real auth before Relay stores
> anything genuinely sensitive.
