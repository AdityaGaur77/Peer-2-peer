# Teacher onboarding

How someone goes from "I want to teach" to running a class on Relay. This is
written for whoever manages teachers, not only for whoever writes the code.

## Why it works this way

Relay has no server. Everything a visitor does is saved in their own browser.
That means:

- An application someone fills in on their phone is **only on their phone**.
- A tutor you approve in the console is **only in your browser**.

Two things get around that:

1. **Application links.** After applying, the teacher emails the team a link
   that has the whole application packed inside it. Opening that link on the
   founder's device files it in the console.
2. **The roster file.** [`src/lib/roster.ts`](src/lib/roster.ts) ships with the
   site, so anyone listed there shows up on the Tutors page for every visitor.

## The steps

| # | Who | What |
|---|-----|------|
| 1 | Teacher | Goes to `/#/teach`. Takes the quiz if their subject has one (only Python and AI do). |
| 2 | Teacher | Fills in the application: name, grade, subjects, days and times they are free, class name, what the class covers. |
| 3 | Teacher | Hits **Email it to the team** (or **Copy** and sends it on Discord/Instagram). |
| 4 | Team | Opens the link on the founder device, enters the passcode. The application appears under **Applications**. |
| 5 | Team | Approves or declines. If approved, hits **Copy roster entry**. |
| 6 | Software | Pastes the entry into `ROSTER` in `src/lib/roster.ts`, checks it reads well, commits and redeploys. The teacher is now public. |
| 7 | Team | **Crew → Onboarding** shows what each teacher still needs. Once nothing is missing, post their first class from **Publish** (or the teacher posts it with the class builder at `/#/guide/tutor`). |
| 8 | Team | Hits **copy invite** on the class card and sends it to the teacher and the students. That link is how a class reaches people. |

Teachers can also skip steps 1–4 if they send their details another way (the
Discord replies below are an example). Then go straight to step 6 and write
the roster entry by hand.

## What we ask every teacher

1. Name, plus whether their full name can be public (the default is first
   name + last initial, since most of us are minors)
2. Grade
3. Subject(s)
4. Class name, and two or three sentences on what it covers
5. **Days and times they are usually free.** Classes repeat weekly, so we need
   a recurring slot, not a single date. (One teacher asked "is this a one-time
   thing?", so the form now says so.)
6. How long a class runs and how often (weekly, every other week)

Keep emails and phone numbers in the team's private sheet, never in
`roster.ts`. That file ships to every visitor.

## Current roster

| Teacher | Subject | Class | Free | Still need |
|---------|---------|-------|------|-----------|
| Sohail T. | Math | Algebra 1, Algebra 2 | — | days and times |
| Abhiram K. | Math | Geometry and Algebra | Tue & Wed 6–8pm | grade, class name |
| Akil | Math, Spanish | Geometric Foundations, Algebraic Foundations, Basic Spanish Essentials | Any day after 5pm, 90 min | grade, last initial, **pricing (see below)** |
| Haggai K. | English | Foundational English Skills | Tue 7:30–8:30pm, every other week | grade |
| Ayden J. | Engineering & CAD | Introduction to Engineering Design and CAD | — | days and times, spelling of last name |

## Open questions for the team

- **Akil wants to charge** $15 a class for the first four, then $20. Relay is
  free (it's the whole pitch, and volunteer hours depend on it). Either he
  teaches free here, or his paid tutoring stays separate from Relay. His
  pricing is not on the site.
- **Volunteer hours / Foothill club.** The site already generates a printable
  certificate of hours from logged sessions (`/#/certificate`). Check what the
  school or club needs on it (an advisor signature? a specific form?) before
  promising hours.
- **Rosters of who signed up** need a backend. Until then, ask students to
  reply in the group chat or Instagram DMs.
