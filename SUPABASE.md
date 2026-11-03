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

Both files are safe to run again later. **Whenever an update changes
`schema.sql`, run it again** so the database gets the new columns (for
example, class prices were added this way).

## 3. Set up sign-in

Students and teachers sign in with a 6-digit code sent to their email, so
there are no passwords.

1. **Authentication → Sign In / Providers → Email**: make sure it is on.
   Leave "Confirm email" on.
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
