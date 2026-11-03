// Drives src/lib/remote.ts against a local PostgREST + Postgres running
// supabase/schema.sql. Not shipped; see the PR for how it was run.
import { createHmac } from 'node:crypto';
import http from 'node:http';
import { createServer } from 'vite';

const SECRET = 'super-secret-jwt-token-with-at-least-32-characters';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims) => {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 });
  return `${h}.${p}.${createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`;
};

// supabase-js calls <url>/rest/v1/...; PostgREST serves at /
const proxy = http.createServer((req, res) => {
  const up = http.request(
    { host: '127.0.0.1', port: 3055, path: req.url.replace(/^\/rest\/v1/, ''), method: req.method, headers: req.headers },
    (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); },
  );
  req.pipe(up);
}).listen(3056);

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { createClient } = await import('@supabase/supabase-js');
const { fetchState, remote } = await vite.ssrLoadModule('/src/lib/remote.ts');

const anonKey = jwt({ role: 'anon' });
const as = (email) =>
  createClient('http://127.0.0.1:3056', anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: email ? { Authorization: `Bearer ${jwt({ role: 'authenticated', email })}` } : {} },
  });

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
  if (!cond) fails++;
};
const err = async (p) => { try { await p; return null; } catch (e) { return e.message; } };

const boss = as('boss@x.com'), teach = as('abhiram@x.com');
const s = as('sam@x.com'), k = as('kid@x.com'), o = as('olu@x.com'), anon = as(null);

try {
  let st = await fetchState(anon, null);
  check('visitors see the 6 seeded teachers', st.state.tutors.length === 6);
  check('visitors are not admin', st.isAdmin === false);
  check('teacher emails stay private', st.state.tutors.every((t) => t.email === ''));

  const start = new Date(Date.now() + 2 * 86400000).toISOString();
  const session = {
    id: 'sess_e2e', title: 'Geometry help', subject: 'math', level: 'all', description: 'x',
    tutorId: 'roster-abhiram', startISO: start, durationMin: 60, capacity: 1,
    link: 'https://meet.google.com/aaa-bbbb-ccc', meetingId: '123 456', passcode: 'pw1', minAge: 13, price: 15,
    attendees: [], waitlist: [], status: 'scheduled',
  };
  check('a student cannot post a class', !!(await err(remote.createSession(s, session))));
  check('the teacher posts their own class', (await err(remote.createSession(teach, session))) === null);

  st = await fetchState(anon, null);
  const pub = st.state.sessions.find((x) => x.id === 'sess_e2e');
  check('visitors see the class', !!pub);
  check('visitors see its price', pub?.price === 15);
  check('a price of $20 or more is refused',
    !!(await err(remote.createSession(teach, { ...session, id: 'sess_pricey', price: 20 }))));
  check('visitors do not see the meeting link', pub?.link === '' && pub?.passcode === undefined);

  for (const [c, email, name, age] of [[s, 'sam@x.com', 'Sam', 15], [k, 'kid@x.com', 'Kid', 12], [o, 'olu@x.com', 'Olu', 16]]) {
    await remote.saveProfile(c, { email, name, age, role: 'student' });
  }
  check('Sam (15) saves a spot', (await err(remote.joinClass(s, 'sess_e2e', { email: 'sam@x.com', name: 'Sam', age: 15 }))) === null);
  const kidErr = await err(remote.joinClass(k, 'sess_e2e', { email: 'kid@x.com', name: 'Kid', age: 12 }));
  check('Kid (12) is turned away by the age limit', /ages 13/.test(kidErr ?? ''), kidErr);
  const fullErr = await err(remote.joinClass(o, 'sess_e2e', { email: 'olu@x.com', name: 'Olu', age: 16 }));
  check('Olu gets "full" when there is no seat', /full/.test(fullErr ?? ''), fullErr);
  check('Olu joins the waitlist', (await err(remote.joinClass(o, 'sess_e2e', { email: 'olu@x.com', name: 'Olu', age: 16 }, true))) === null);

  st = await fetchState(s, 'sam@x.com');
  let mine = st.state.sessions.find((x) => x.id === 'sess_e2e');
  check('Sam sees himself as going', mine.attendees.some((a) => a.email === 'sam@x.com'));
  check('Sam sees the link, ID and passcode', mine.link.includes('meet.google.com') && mine.meetingId === '123 456' && mine.passcode === 'pw1');
  check('Sam sees a waitlist count but not who', mine.waitlist.length === 1 && mine.waitlist[0].email.startsWith('hidden:'));

  st = await fetchState(o, 'olu@x.com');
  mine = st.state.sessions.find((x) => x.id === 'sess_e2e');
  check('Olu is #1 on the waitlist', mine.waitlist[0]?.email === 'olu@x.com');
  check('Olu cannot see the link while waiting', mine.link === '');

  st = await fetchState(teach, 'abhiram@x.com');
  mine = st.state.sessions.find((x) => x.id === 'sess_e2e');
  check('the teacher sees who signed up by name', mine.attendees[0]?.name === 'Sam' && mine.waitlist[0]?.name === 'Olu');
  check('the teacher sees their own login email', st.state.tutors.find((t) => t.id === 'roster-abhiram').email === 'abhiram@x.com');

  check('a student cannot change the link',
    (await err(remote.updateMeeting(s, ['sess_e2e'], { link: 'https://meet.google.com/evil-evil-evi' }))) === null &&
    (await fetchState(s, 'sam@x.com')).state.sessions.find((x) => x.id === 'sess_e2e').link.includes('aaa-bbbb-ccc'));
  await remote.updateMeeting(teach, ['sess_e2e'], { link: 'https://meet.google.com/new-link-abc', meetingId: '', passcode: '' });
  st = await fetchState(s, 'sam@x.com');
  mine = st.state.sessions.find((x) => x.id === 'sess_e2e');
  check('Sam sees the new link, marked as updated', mine.link.includes('new-link-abc') && !!mine.linkUpdatedISO);
  check('cleared passcode is gone', mine.passcode === undefined);

  await remote.leaveClass(s, 'sess_e2e', 'sam@x.com');
  st = await fetchState(o, 'olu@x.com');
  mine = st.state.sessions.find((x) => x.id === 'sess_e2e');
  check('when Sam leaves, Olu moves up and gets the link', mine.attendees.some((a) => a.email === 'olu@x.com') && mine.link.includes('new-link-abc'));

  st = await fetchState(boss, 'boss@x.com');
  check('admin is recognised', st.isAdmin === true);
  check('admin sees every student', st.state.students?.length === 3, String(st.state.students?.length));
  check('a student does not get the student list', (await fetchState(s, 'sam@x.com')).state.students === undefined);

  await remote.setBlocked(boss, 'kid@x.com', true);
  check('a blocked student cannot unblock themselves', !!(await err(remote.setBlocked(k, 'kid@x.com', false))));

  const app = { name: 'Priya R', email: 'priya@x.com', grade: '11th', subjects: ['chemistry'], why: '', availability: [], courseTitle: 'Stoich', courseSummary: 'Moles', times: 'Mon 4pm' };
  const priya = as('priya@x.com');
  check('someone cannot apply as another email', !!(await err(remote.submitApplication(s, app, 'app_x'))));
  check('Priya applies', (await err(remote.submitApplication(priya, app, 'app_1'))) === null);
  st = await fetchState(boss, 'boss@x.com');
  check('admin sees the application', st.state.applications.some((a) => a.id === 'app_1' && a.courseTitle === 'Stoich'));
  await remote.addTutor(boss, { id: 'tutor_priya', name: 'Priya R', email: 'priya@x.com', grade: '11th', tagline: 'hi', subjects: ['chemistry'], joinedISO: new Date().toISOString(), hue: 100 });
  await remote.setApplicationStatus(boss, 'app_1', 'approved');
  st = await fetchState(priya, 'priya@x.com');
  check('approved: Priya is a teacher and can see her login email', st.state.tutors.find((t) => t.id === 'tutor_priya')?.email === 'priya@x.com');
  check('approved: her application shows approved', st.state.applications.find((a) => a.id === 'app_1')?.status === 'approved');

  await remote.retireTutor(boss, 'tutor_priya');
  st = await fetchState(anon, null);
  check('retiring a teacher keeps them for history but marks inactive', st.state.tutors.find((t) => t.id === 'tutor_priya')?.active === false);

  await remote.addRequest(s, { id: 'req_1', topic: 'Trig identities', subject: 'math', by: 'Sam', votes: 1, votedBy: ['sam@x.com'], atISO: '' }, 'sam@x.com');
  await remote.voteRequest(o, 'req_1');
  await remote.voteRequest(o, 'req_1');
  st = await fetchState(anon, null);
  check('topic votes count once per person', st.state.requests.find((r) => r.id === 'req_1')?.votes === 2);

  await remote.addKudos(s, { id: 'k1', tutorId: 'roster-abhiram', from: 'Sam', message: 'Thanks!', atISO: '' });
  check('kudos show publicly', (await fetchState(anon, null)).state.kudos.length === 1);
  check('visitors cannot leave kudos', !!(await err(remote.addKudos(anon, { id: 'k2', tutorId: 'roster-abhiram', from: 'X', message: 'spam', atISO: '' }))));

  await remote.saveCertification(s, { email: 'sam@x.com', subject: 'python', score: 9, total: 10 });
  await remote.saveCertification(s, { email: 'sam@x.com', subject: 'python', score: 10, total: 10 });
  st = await fetchState(s, 'sam@x.com');
  check('quiz retakes replace the old score', st.state.certifications.length === 1 && st.state.certifications[0].score === 10);

  await remote.cancelSession(teach, 'sess_e2e');
  st = await fetchState(anon, null);
  check('teacher cancels their class', st.state.sessions.find((x) => x.id === 'sess_e2e')?.status === 'canceled');
} catch (e) {
  console.log('CRASH', e);
  fails++;
} finally {
  await vite.close();
  proxy.close();
}
console.log(fails === 0 ? 'ALL LIVE CHECKS PASS' : `${fails} CHECK(S) FAILED`);
process.exitCode = fails ? 1 : 0;
