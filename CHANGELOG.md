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
