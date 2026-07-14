# Relay — free peer-to-peer tutoring

Free, live tutoring in **Python** and **AI**, taught by students for students.
Modeled on [schoolhouse.world](https://schoolhouse.world): no fees, ever — you
repay your education by teaching the next person. This is the free-platform
successor to the old paid *Peer2Peer* app.

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

Before sharing publicly: set your real contact email and a new admin passcode in
[`src/lib/config.ts`](src/lib/config.ts), and swap the placeholder crew in
[`src/lib/seed.ts`](src/lib/seed.ts) for your actual friends.

## What's inside

- **Home** — hero with the animated relay chain, live community stats, subject
  cards, the "how it works" bento, a kudos marquee, and the why-it's-free story.
- **Sessions** — searchable, filterable board of free live sessions; RSVP saves
  your spot and exports a calendar invite. Full sessions take a waitlist, and
  releasing a spot auto-promotes the first person waiting. Live sessions get a
  pulsing "live now" state. Learners request + upvote topics.
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
- **Founder console** (`/#/admin`) — review applications, approve tutors, publish
  sessions. Passcode + everything else in [`src/lib/config.ts`](src/lib/config.ts).

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
- **New subjects** — add to `SUBJECTS` in `src/lib/types.ts` (Math / Physics /
  Web Dev are already teased on the landing page).

> ⚠️ The admin passcode is client-side — it keeps friends out, not attackers.
> Before this handles real student data, add real auth and a backend.
