# Launch checklist

The founder console (`/#/admin` → **Overview**) runs the first four of these
live against the site. This file covers the rest.

## Before you publish

- [ ] **Publish one real class** through the builder at `/#/guide/tutor`, then
      **copy invite** on its card and send that link to a few people. That's the
      whole launch: one class, one link.
- [ ] **Clear the demo content.** Console → **Data → Go live**. The site ships
      with seeded placeholders — invented tutors, sample thank-you notes, and a
      fabricated session history that feeds the homepage counters. Visitors read
      those as real. Going live deletes them and keeps only you plus anything
      genuinely created.
- [x] **Founder passcode changed.** `ADMIN_CODE` in
      [`src/lib/config.ts`](src/lib/config.ts) is no longer the shipped default.
      It still lives in the JS bundle and in this repo, so treat it as a latch:
      never reuse a password from anywhere else. (Harmless if read — every
      visitor only ever unlocks their own browser's copy of the board.)
- [x] **Real contact email set.** `CONTACT_EMAIL` points at a live inbox, so the
      footer and About page reach you.
- [ ] **Put at least one session on the board.** An empty board on launch day is
      a bounce. Use the class builder at `/#/guide/tutor`.
- [ ] **Check your name.** `FOUNDER_NAME` signs every volunteer certificate and
      appears in the hero relay chain.
- [ ] Rebuild after editing config: `npm run build`.

## Deploy

`dist/` is a fully static site — hash routing, relative asset paths, self-hosted
fonts. No server, no env vars.

- **Netlify** — drag `dist/` onto [app.netlify.com/drop](https://app.netlify.com/drop)
- **Vercel** — `npx vercel` from the project root
- **GitHub Pages** — `npx gh-pages -d dist`

## Know before you share the link

**Data lives in each visitor's browser, not a server.** Two consequences, and
one of them has a workaround built in:

**Sharing a class → solved by invite links.** Hit **copy invite** on any session
card. That link carries the entire class *inside the URL* (compressed, ~350–400
characters), so anyone who opens it — even someone who has never seen Relay —
gets the class on their board with one click. Use these to announce sessions in
group chats. There's also a printable **flyer** (the "flyer" link on your own
sessions) for hallway noticeboards.

**Seeing who signed up → still needs a backend.** RSVPs are saved in each
visitor's own browser, so you won't see a roster. For a friends-and-classmates
pilot this is usually fine: the invite link gets people the time and the room
link, and headcount sorts itself out when everyone joins the call. If you need a
real roster, ask people to reply in the group chat, or add a backend — the swap
is contained, since [`src/lib/store.tsx`](src/lib/store.tsx) is the only file
that touches storage. Replace its functions with API calls and no component
changes.

Also worth knowing: clearing browser data wipes that person's copy, so
**export a backup** (console → Data) after any session you care about.

## After launch

- `npm run smoke` — SSR-renders every route and asserts key content. Run it
  before any redeploy.
- Console → **Data → Export** — download a backup regularly. It's the only copy.
