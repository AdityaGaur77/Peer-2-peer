# Changelog

All dates are when the work was committed locally in the clone.

## 2026-11-13 — Launch-readiness pass 2 (`review-fixes`)

- **Error reporting** (`public.errors` + `src/lib/report.ts`): crashes are
  caught at the root (`window.error` / unhandled rejections), scrubbed of
  emails and phone numbers, and sent to a first-party table anyone can insert
  into but only the team can read. The console's Analytics tab shows the
  latest ones. Offline mode stores them in the browser.
- **Self-service account deletion** (`delete_my_account()` + dashboard
  button): the privacy page promised it; now it exists. Profile, signups,
  applications and 1-on-1 requests are removed, the email is scrubbed from
  analytics, volunteer-hour records are kept de-identified. Team accounts
  cannot delete themselves from the site.
- **Security headers** for Vercel (`vercel.json`) and Netlify
  (`public/_headers`): `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options: DENY`, `Permissions-Policy` (no camera/mic/geo).
- **Analytics ceiling set to 2,000 events per 10 minutes** (from 5,000), keeping
  the per-request 50-row limit. The live-e2e suite confirms it end-to-end.
- **Class materials** — teachers can paste a Google Doc / slides link on a
  class via "Add materials" on the class card. It's private to the class
  (like the meeting link), validated as `https://`, and cleared by the
  teacher at any time.
- **schema.sql is re-runnable again** — every constraint, RLS policy and
  trigger has a matching `drop … if exists`, so the "run it after each update"
  instruction in `SUPABASE.md` is now trustworthy.
- **Blank class links** are allowed (`session_rooms.link` may be `''`): a class
  posts without a room and the console flags it.
- **Attendance can't be self-marked** — the signup trigger forces
  `attended := false`; only a teacher/admin can tick it.
- **Public volunteer hours work** — `session_counts()` returns an `attended`
  count and anonymous seat placeholders carry it, so Home, About and teacher
  cards don't show 0 for everyone.
- **Series signups say the truth** — "you're going — 6 of 8 weeks", and a
  **Leave all N weeks** button releases every held seat.
- **Privacy page now matches the code**: signed-out analytics are disclosed,
  the "private browsing" claim was replaced with a working **Turn off
  analytics** footer switch (and the tracker honours Do Not Track / GPC), and
  thank-yous store first names only.
- **Anyone can report a specific thank-you or topic request** (mailto with
  text prefilled), not only the console.
- **CI** — GitHub Actions runs `npm ci → build → lint → smoke` on pushes and
  pull requests.
- **Local database verification** (`scripts/local-verify/`) — a throwaway
  Postgres 18 + PostgREST runs `schema.sql` twice (it previously failed the
  second time) and then `live-e2e.mjs` and `supplementary-e2e.mjs`: **77/77**
  and **9/9** checks pass. No Docker, no admin rights.
- **Optional CAPTCHA on sign-in** (`VITE_HCAPTCHA_SITE_KEY`) — hCaptcha
  renders on the email step; the code is only requested once it's solved.
  Off unless you configure it, so nothing breaks. See SUPABASE.md.
- **Analytics ceiling** — raised from the 1,000 I set (which silently
  dropped the live-e2e suite's batched inserts) to 2,000/10 minutes, keeping
  the 50-rows-per-request limit.

## 2026-11-11/12 — Launch-readiness pass 1 (`review-fixes`)

- Success toasts now wait for the database; series posting gives one summary
  toast instead of one per week; toasts capped at 3.
- **Volunteer hours count attendance, not signup** — `attended` flag,
  `set_attendance()`, "came" ticks on class cards, dashboard nudge.
- Console: fix the phone-scrolling teacher table, remove/report for
  thank-yous and topic requests, attendance marking, teacher self-edit card.
- **13+ sign-up** in the client and schema (COPPA), with an under-13 cleanup
  note in `schema.sql`.
- **Parent email required** for 1-on-1 requests from under-18s (client + DB
  trigger), `parent_email` shown to the teacher.
- Full **Privacy & terms** page at `/privacy`, linked from the footer and the
  sign-in box.
- Link preview image (`og.png`) and OG/Twitter meta tags.
- Waiting-room and link-rotation guidance wherever a meeting link is pasted.
- `npm audit` 6 high → 0.
- Docs rewritten to match reality (README, LAUNCH, SUPABASE, TEACHERS).
