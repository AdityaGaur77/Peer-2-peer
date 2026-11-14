# Connecting Supabase

Until these steps are done the site works the old way, with everything saved
in each visitor's own browser. After them, classes, signups, meeting links and
applications are shared by everyone, and the console shows real numbers.

Takes about 20 minutes. Do it from the project email account.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up
   with the project email (not "Continue with GitHub").
2. Turn on two-factor login: avatar (top right) → **Account preferences** →
   **Multi-factor authentication**.
3. Create an organization called **Peer 2 Peer** on the **Free** plan.
4. **New project** → name `relay`, click **Generate a password** and save it in
   a password manager, pick the region closest to you (e.g. West US) → **Create**.
5. Wait a couple of minutes for it to finish setting up.

## 2. Create the tables

1. Left sidebar → **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) in GitHub, click **Raw**,
   copy everything, paste it in, click **Run**. It should say "Success. No rows
   returned".
3. New query again, do the same with [`supabase/seed.sql`](supabase/seed.sql).
   That adds the teachers from the roster.
4. New query once more. Replace the two example emails below with **your real
   emails, in lowercase** (the project email and your personal one, plus
   anyone else on the team who should see the admin console), then run it:

   ```sql
   insert into admins (email) values
     ('the-real-project-email@gmail.com'),
     ('your-real-personal-email@gmail.com');
   ```

   To check who is an admin: `select * from admins;`
   To remove one: `delete from admins where email = 'someone@gmail.com';`

Both files are safe to run again later — every table, constraint, policy and
trigger is dropped-and-recreated or created-if-missing, so a second run is a
no-op rather than an error. **Whenever an update changes
`schema.sql`, run it again, but only after Vercel has finished deploying
that update.** The database rules and the website change together; new rules
with the old website can stop pages loading. So: merge the PR, wait for the
deploy to show "Ready", then run `schema.sql`.

The current `schema.sql` adds, on top of the original tables:

- **Attendance** (`signups.attended`) — teachers mark who actually came from
  the class card; hours and certificates only count those students. The public
  seat-count function returns an `attended` count too, so hours show correctly
  on the home page and teacher cards without exposing names.
- **13+ only** — profiles and class minimum ages now enforce 13+. Existing
  rows are untouched (`not valid`); see the bottom of the file if you have
  under-13 profiles to remove.
- **Parent email for 1-on-1** (`tutoring_requests.parent_email`) — required
  by the guard trigger for students under 18.
- **Blank meeting links** — a class can be posted before its link exists
  (`session_rooms.link` may be `''`); the console flags it until the teacher
  pastes a real one.
- **Class materials** (`session_rooms.materials` + `set_materials()`) — one
  https link (notes, slides) per class, readable only by the teacher, the
  team and the people in the class. Teachers post it from the class card.
- **Error reporting (`public.errors`)** — the site records its own crashes,
  scrubbed of emails and phone numbers; everyone may insert, only the team
  reads, and the console's Analytics tab shows the latest ones.
- **Self-service deletion (`delete_my_account()`)** — the button on the
  dashboard calls this: profile, signups, applications, 1-on-1 requests are
  removed and the email is scrubbed from analytics. Volunteer hours for
  classes already taught are kept de-identified.
- **First names on thank-yous** — the public kudos table stores only a first
  name. Older rows may still hold a full name; the bottom of the file has a
  cleanup line if you want them trimmed.
- **A tighter analytics ceiling** — 1,000 events per 10 minutes instead of
  5,000.
- **`set_my_profile` / `set_attendance`** — the teacher self-service functions.

## 3. Set up sign-in

Students and teachers sign in with a 6-digit code sent to their email, so
there are no passwords.

1. **Authentication → Sign In / Providers → Email**: make sure it is on.
   Leave **"Confirm email" on**. The site only signs people in with emailed
   codes, so also turn **off** sign-ups with a password if Supabase offers that
   option (otherwise someone could create an account for an email they don't
   own, such as an admin's).
2. **Authentication → Emails → Templates → Magic Link**. Replace the body with
   this, so the email contains the code as well as the link:

   ```html
   <h2>Your Peer 2 Peer sign-in code</h2>
   <p>Type this code on the site:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a> on the device you started on.</p>
   <p>If you didn't ask for this, ignore it.</p>
   ```

   Do the same for the **Confirm signup** template, since first-time sign-ins
   get that one.
3. **Authentication → URL Configuration**
   - **Site URL**: your live Vercel address, e.g. `https://peer-2-peer.vercel.app`
   - **Redirect URLs**: add each of these as its own entry. Every one starts
     with `https://` (or `http://` for localhost) and ends with `/**`:
     - `https://peer-2-peer.vercel.app/**` (the live site)
     - `https://*-peer2-peer1.vercel.app/**` (preview deploys on the team account)
     - `https://*-adityagaur12077-5370s-projects.vercel.app/**` (preview deploys
       on the personal account, only while it still deploys this repo)
     - `http://localhost:5173/**` (running it on your own computer)

     A single deploy address like `peer-2-peer-c73bym6rl-....vercel.app` isn't
     needed; the wildcard lines cover every preview.

## 4. Email sending (before real students)

Supabase's built-in email sender only allows a few emails an hour. That's
fine for testing, but a class of students signing in at once will hit it.
Before you post the link publicly:

**Authentication → Emails → SMTP Settings → Enable custom SMTP**, then either:

- **Resend** (free for 3,000 emails a month): sign up at resend.com with the
  project email, create an API key, and use host `smtp.resend.com`, port `465`,
  user `resend`, password = the API key. Without your own domain you can only
  send to your own address, so this one needs a domain.
- **Gmail** (no domain needed): on the project Gmail turn on 2-step
  verification, then create an **App password** (Google Account → Security →
  App passwords). Host `smtp.gmail.com`, port `465`, user = the project Gmail
  address, password = the app password **with the spaces removed** (Google
  shows it as four groups of four; it's really 16 letters), sender email = the
  same Gmail address (Gmail refuses to send as any other address). Gmail allows
  about 500 emails a day, which is plenty to start.

Then **Authentication → Rate Limits** and raise "emails sent per hour" to
something like 100.

## 5. Connect the website

1. Supabase → **Project Settings → API** (may be called **API Keys**). Copy the
   **Project URL** and the **anon / publishable** key.
   **Never copy the `service_role` / secret key anywhere.**
2. Vercel → peer-2-peer → **Settings → Environment Variables**. Add these, each
   as type **Config**, all environments:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | the Project URL |
   | `VITE_SUPABASE_ANON_KEY` | the anon key |
   | `VITE_ADMIN_CODE` | the console passcode you want |

   Vercel warns that `VITE_` values are visible in the browser. That's expected
   for all three: the anon key is public by design, and the passcode is only the
   first lock on the console (the second is signing in with an email from the
   `admins` table).
3. **Deployments → ⋯ on the latest → Redeploy.** Vite reads these when the site
   is built, so nothing changes until you redeploy.

## 6. Check it worked

1. Open the live site → `/#/admin` → enter the passcode → you'll be asked to
   sign in. Use an email you put in `admins`.
2. **Overview → Launch readiness** should say **Connected to Supabase**.
3. **Teachers** tab → **Edit** each teacher → fill in their **login email**
   (private, never shown). That is what lets them sign in, post classes and
   change their meeting links.
4. Post a test class from **Publish**, open the site on your phone, sign in as
   a student and save a spot. It should show up under **Classes → Who signed
   up** on your computer within a few seconds.

## If sign-in says "Error sending confirmation email"

That means Supabase couldn't hand the email to Gmail. Check, in order:

1. **Logs → Auth** in Supabase shows the exact reason next to the failed
   request (for example "535 Username and Password not accepted").
2. The app password has **no spaces**.
3. **Username** and **Sender email** are both the full project Gmail address.
4. Host `smtp.gmail.com`, port `465`.
5. 2-step verification is still on for that Google account (turning it off
   deletes every app password).
6. If it still fails, make a fresh app password and paste that in.

To check sign-in itself works while you sort out email, turn **custom SMTP
off** for a moment: Supabase's own sender works for a few emails an hour.

## Optional: “Sign in with Google”

School accounts often block outside mail, which is why school addresses are a
jittery way to deliver codes. If enough students hit that, add Google as a
provider and the whole code flow goes away:

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID**
   (Web application). Add Supabase's callback URL from
   **Authentication → Providers → Google** (it looks like
   `https://<project>.supabase.co/auth/v1/callback`) as an Authorized redirect URI.
2. Paste the client ID and secret into **Authentication → Providers → Google**,
   turn it on.
3. Site code: add a "Continue with Google" button next to the email field in
   `src/components/SignInModal.tsx` that calls
   `supabase.auth.signInWithOAuth({ provider: 'google' })`. The existing
   first-time "welcome" step (name, age, role) still runs afterwards, and all
   the database rules stay as they are — a Google email is just an email.

This is optional and deliberately not wired up until you turn the provider on;
a button that errors helps nobody.

## Analytics

Visits are recorded in the `events` table and shown in the console's
**Analytics** tab. Crashes are recorded in the `errors` table and shown in the
same tab. Both databases cap writes (50 rows per request; 1,000/300 events per
10 minutes respectively), but the tables still grow forever unless you trim
them. Run this in the SQL Editor now and then — every month is fine:

```sql
delete from events where at < now() - interval '30 days';
delete from errors where at < now() - interval '30 days';
```

If you'd rather not think about it, `pg_cron` can run the same statements on a
schedule — enable the extension and create one cron job per line.

Visitors who aren't signed in are anonymous (a random id per browser). Once
someone signs in, their visits from that browser show their email, so mention
that in your privacy note. Events from before someone signed in keep belonging
to whoever was signed in then. The full data policy is in the site's
**Privacy & terms** page (`/#/privacy`).

## Things to know

- **Free projects pause after a week with no visitors.** The dashboard has a
  **Restore** button; nothing is lost.
- **Looking at the raw data**: **Table Editor** in Supabase shows every table.
  You can fix a typo there directly, but use the console for anything to do
  with signups so the waitlist rules run.
- **Adding teachers later**: approve their application in the console. It
  makes them a teacher and saves their login email in one step.
- **Who can see what** is enforced in the database itself
  (`supabase/schema.sql`, the "row-level security" section): visitors see
  classes but not meeting links, students see the link only for classes they
  have a seat in, teachers see who signed up for their own classes, and only
  admins see the student list.
