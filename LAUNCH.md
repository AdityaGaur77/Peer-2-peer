# Launch checklist

The founder console (`/#/admin` → **Overview**) checks most of this against the
live site. This file covers the rest.

## Before you publish

- [ ] **Set the founder passcode on your host.** The console reads
      `VITE_ADMIN_CODE`. On Vercel: **Settings → Environment Variables**, add
      `VITE_ADMIN_CODE`, then **redeploy** (Vite bakes env vars in at build time).
      Without it the deployed console stays locked.
- [ ] **Protect sign-in from abuse** (optional but recommended): add the
      CAPTCHA key described in [SUPABASE.md](SUPABASE.md) so nobody can make
      your Gmail send sign-in codes to addresses it doesn't own.
- [ ] **Connect Supabase** by following [SUPABASE.md](SUPABASE.md), so classes,
      signups and meeting links are shared instead of living in one browser.
- [ ] **Publish one class** at `/#/guide/tutor`, then hit **copy invite** on its
      card and send that link to a few people. That is the whole launch: one
      class, one link.
- [ ] **Check your name.** `FOUNDER_NAME` in `src/lib/config.ts` signs every
      volunteer certificate and appears in the hero.
- [x] **Contact email set.** `CONTACT_EMAIL` points at a live inbox.
- [x] **No sample data.** A new board starts with you and nothing else, so there
      are no invented tutors or fake numbers to clear out.
- [ ] **Re-run `schema.sql`** after deploying this update — it adds attendance
      marking, the 13+ age rules and the parent-email requirement, and existing
      databases keep their old checks until you do. If you have students stored
      with an age under 13, decide what to do with them (see the bottom of
      `schema.sql`).
- [x] **Privacy & terms page live** at `/#/privacy` — linked in the footer and
      covering what we collect (13+ only, first-party analytics, no IP addresses, no ads).

## Deploy

`dist/` is a fully static site — hash routing, relative asset paths, self-hosted
fonts. The site itself needs no server, but the live database does: set
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_ADMIN_CODE` in your
host's environment variables, or the site ships in demo mode (everything saved
in each visitor's browser, sign-in accepts any email unchecked). The LAUNCH
checklist in the console confirms which mode you're in.

- **Netlify** — drag `dist/` onto [app.netlify.com/drop](https://app.netlify.com/drop)
- **Vercel** — `npx vercel` from the project root, then add the env vars and redeploy
- **GitHub Pages** — `npx gh-pages -d dist`

## Know before you share the link

**With Supabase connected, data lives in the database**: sign-ins, classes,
signups, meeting links, analytics. **Without it, everything lives in each
visitor's browser** — two consequences, and one has a workaround built in:

**Sharing a class → solved by invite links.** Hit **copy invite** on any session
card. That link carries the entire class *inside the URL* (compressed, ~350–400
characters), so anyone who opens it — even someone who has never seen Peer 2 Peer —
gets the class on their board with one click. Use these to announce sessions in
group chats. There's also a printable **flyer** (the "flyer" link on your own
sessions) for hallway noticeboards.

**Seeing who signed up → only works with Supabase.** Offline, RSVPs are saved in
each visitor's own browser, so you won't see a roster. For a friends-and-classmates
pilot that's usually fine; if you need the real roster, connect Supabase — the
swap is contained, since [`src/lib/store.tsx`](src/lib/store.tsx) is the only file
that touches storage.

**Hours now mean attendance.** Volunteer hours and the certificate only count
classes that were free *and* had at least one student the teacher marked **came**
(open the class card → "Who's coming" → tick "came"). Signing up no longer adds
hours.

Also worth knowing: with Supabase free tier, empty the analytics table now and
then (`delete from events where at < now() - interval '30 days'`). It can't
defeat you on its own — the database caps it — but 500 MB is yours to lose.
And clearing browser data wipes a person's offline copy, so **export a backup**
(console → Data) after any session you care about.

## After launch

- `npm run smoke` — SSR-renders every route and asserts key content. Run it
  before any redeploy.
- Console → **Data → Export** — download a backup regularly. In offline mode it's
  the only copy; with Supabase it's a cheap safety net on top of the database.
