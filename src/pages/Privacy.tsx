import { Reveal } from '../components/Reveal';
import { CONTACT_EMAIL } from '../lib/config';
import { Link } from 'react-router-dom';

const h3 = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: 'var(--ink)',
  marginBottom: 8,
} as const;

const p = { fontSize: 15, lineHeight: 1.75, color: 'var(--ink-2)', maxWidth: '72ch' } as const;

/**
 * Plain-language privacy policy and terms of use. Peer 2 Peer is a student
 * project, not a company: this page says what we collect, who sees it, and
 * what we don't do with it. Reviewed against COPPA (under-13s are not
 * allowed) and written for parents and students, not lawyers.
 */
export function Privacy() {
  return (
    <div className="section" style={{ paddingTop: 'clamp(110px, 15vw, 150px)' }}>
      <div className="container">
        <div className="section-head" style={{ maxWidth: 780 }}>
          <Reveal delay={0.05}>
            <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}>
              Privacy &amp; terms
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">
              Peer 2 Peer is a volunteer program run by students, for students. We collect the
              least we can, you never pay us, and nobody's data is sold or used for ads.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <div className="card card-pad stack" style={{ gap: 26, maxWidth: 860 }}>
            <section>
              <h2 style={h3}>The short version</h2>
              <ul style={{ ...p, paddingLeft: 18, display: 'grid', gap: 6 }}>
                <li>Sign-up asks for your name, email and age. We need the email to send you the class link, and the age because classes have minimum ages (and we're 13+ only).</li>
                <li>We don't run ads, sell data, or share it with anyone outside the Peer 2 Peer team.</li>
                <li>Visits to the site — signed in or not — are counted in a private analytics table (pages you saw, clicks, device type). No IP addresses, no ad networks, and it's kept only for as long as it's useful. You can turn it off in the footer.</li>
                <li>Under 13s can't sign up. Parents: if you'd like your under-13's data removed, email us.</li>
                <li>You can ask us to export or delete your data any time at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
              </ul>
            </section>

            <section>
              <h2 style={h3}>What we collect, and why</h2>
              <p style={p}>
                <b>When you create an account</b>, we store your email address, the name you give
                us, your age and whether you're a student or a teacher. Email is how you sign in
                (a 6-digit code — we never store a password) and how teachers reach you about a
                class you joined.
              </p>
              <p style={p}>
                <b>When you join a class</b>, we store which classes you saved a spot in and
                whether you actually came (teachers tick that after the class). Teachers use it to
                count volunteer hours; it is not marketing data.
              </p>
              <p style={p}>
                <b>Analytics.</b> We keep a first-party events log: pages viewed, clicks, and
                time on each page, along with your device type, browser, operating system, screen
                size, language and time zone. We do not store IP addresses and we do not
                fingerprint. Visitors are a random id; once you sign in, events from that browser
                get your email attached, so we can see how students found us (e.g. search vs a
                group chat). Only the Peer 2 Peer team can read this table.
              </p>
              <p style={p}>
                <b>Without an account</b>, nothing you type is stored on our side: joining a
                class, posting a thank-you or requesting a topic asks you to sign in first. The one
                thing that is sent while signed out is an anonymous page view — a random browser id,
                the page, and basic device details, with no email attached. In offline mode (no
                database connected) even those stay in your browser.
              </p>
            </section>

            <section>
              <h2 style={h3}>Who can see what</h2>
              <ul style={{ ...p, paddingLeft: 18, display: 'grid', gap: 6 }}>
                <li><b>Everyone</b> — teachers' names, their classes, ages (13+), and seat counts. Meeting links are never public: only students holding a seat in a class see its link.</li>
                <li><b>Teachers</b> — the names and emails of students signed up for their own classes, so they know who's coming. They mark attendance after each class.</li>
                <li><b>The Peer 2 Peer team (admins)</b> — the student list (name, email, age, join date, what you signed up for), applications to teach, analytics and thank-yous. The console is locked behind a passcode and an admin account.</li>
                <li><b>Public thank-yous and topic requests</b> show your first name. Don't post anything you wouldn't want strangers to read; the team removes reported posts.</li>
                <li><b>1-on-1 tutoring</b> — the teacher gets your email and (if you're under 18) your parent's email, and arranges everything privately. The site is not a party to that arrangement and holds no payment details.</li>
              </ul>
            </section>

            <section>
              <h2 style={h3}>Students under 13</h2>
              <p style={p}>
                Peer 2 Peer is 13+. We do not knowingly collect information from children under 13.
                Sign-up asks for your age and refuses under-13 accounts, and classes have a minimum
                age. If we learn that an account belongs to a child under 13, we will delete the
                profile and their class signups. If you're a parent or guardian and you believe your
                child has an account, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and
                we'll remove it.
              </p>
            </section>

            <section>
              <h2 style={h3}>Your choices</h2>
              <ul style={{ ...p, paddingLeft: 18, display: 'grid', gap: 6 }}>
                <li><b>See or export your data</b> — email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we'll send it to you.</li>
                <li><b>Delete your account</b> — same email. We'll remove your profile, signups and 1-on-1 requests. Volunteer-hour records for classes already taught are kept de-identified.</li>
                <li><b>Stop analytics</b> — the footer has a <b>Turn off analytics</b> switch; it stops this browser being counted from that point on. We also honour Do Not Track and Global Privacy Control, and there's no tracking cookie to clear because we don't use one.</li>
                <li><b>Corrections</b> — ages and names can be fixed by emailing us; teachers can edit their own card from their dashboard.</li>
              </ul>
            </section>

            <section>
              <h2 style={h3}>Terms of use</h2>
              <ul style={{ ...p, paddingLeft: 18, display: 'grid', gap: 6 }}>
                <li>Peer 2 Peer is a free, student-run extra-help program. It is not a school, not a licensed tutoring service, and not medical, legal or mental-health advice.</li>
                <li>Group classes are free. If a teacher offers 1-on-1 tutoring, any payment is a private arrangement between you (with a parent, if you're under 18) and the teacher — the site takes no fee, stores no card details and guarantees nothing.</li>
                <li>"Volunteer hours" on a certificate are service hours volunteered by a student. They are not employment, wages or a promise of college credit; check what your school or club accepts.</li>
                <li>The class link is private. Don't share it with people who aren't registered for the class, don't record or redistribute classes, and be as kind in the call as you'd be in school.</li>
                <li>Be honest: one account per person, real name, real age, real attendance. The team may block accounts that fake any of that or abuse the calls.</li>
                <li>Classes are on a volunteer schedule — teachers get sick and calls run late. The site and the teachers are provided "as is", and we're not liable for missed classes or outcomes.</li>
                <li>Thank-yous and topic requests are public. Keep them appropriate and true. The team reviews reported posts and removes them.</li>
              </ul>
            </section>

            <section>
              <h2 style={h3}>Changes and contact</h2>
              <p style={p}>
                This page was last updated 11 November 2026. If it changes in a way that matters —
                what we collect, who can see it — we'll say so on the home page before it changes.
                Questions, or a request to see or delete your data:{' '}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
              <p style={p}>
                See also <Link to="/about" style={{ color: 'var(--ember-deep)', borderBottom: '1.5px dotted' }}>how Peer 2 Peer works</Link>.
              </p>
            </section>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
