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
}).listen(3057);

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { createClient } = await import('@supabase/supabase-js');
const { fetchState, remote } = await vite.ssrLoadModule('/src/lib/remote.ts');

const anonKey = jwt({ role: 'anon' });
const as = (email) =>
  createClient('http://127.0.0.1:3057', anonKey, {
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
    link: 'https://meet.google.com/aaa-bbbb-ccc', meetingId: '123 456', passcode: 'pw1', minAge: 15, price: 15,
    attendees: [], waitlist: [], status: 'scheduled',
  };
  check('a student cannot post a class', !!(await err(remote.createSession(s, session))));
  check('the teacher posts their own class', (await err(remote.createSession(teach, session))) === null);

  st = await fetchState(anon, null);
  const pub = st.state.sessions.find((x) => x.id === 'sess_e2e');
  check('visitors see the class', !!pub);
  check('a group class posted with a price is still free', !pub?.price);
  check('visitors do not see the meeting link', pub?.link === '' && pub?.passcode === undefined);

  for (const [c, email, name, age] of [[s, 'sam@x.com', 'Sam', 15], [k, 'kid@x.com', 'Kid', 13], [o, 'olu@x.com', 'Olu', 16]]) {
    await remote.saveProfile(c, { email, name, age, role: 'student' });
  }
  check('Sam (15) saves a spot', (await err(remote.joinClass(s, 'sess_e2e', { email: 'sam@x.com', name: 'Sam', age: 15 }))) === null);
  const kidErr = await err(remote.joinClass(k, 'sess_e2e', { email: 'kid@x.com', name: 'Kid', age: 13 }));
  check('Kid (13) is turned away by a 15+ class', /ages 15/.test(kidErr ?? ''), kidErr);
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

  // refused outright (it's an upsert now); either way the link must not move
  await err(remote.updateMeeting(s, ['sess_e2e'], { link: 'https://meet.google.com/evil-evil-evi' }));
  check('a student cannot change the link',
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

  // ── holes found by the QA pass, now closed ──
  const raw = (c) => c; // supabase-js clients, used directly below
  check('a student cannot raise their own age to get into a class',
    !!(await err(remote.saveProfile(k, { email: 'kid@x.com', name: 'Kid', age: 30, role: 'student' }))));
  const leak = await err(remote.joinClass(s, 'sess_e2e', { email: 'olu@x.com', name: 'x' }));
  check('signing up someone else reveals nothing about them', /only save a spot for yourself/.test(leak ?? ''), leak);
  const anonVotes = await anon.from('requests').select('voted_by');
  check('nobody can read who voted on a topic', !!anonVotes.error);
  check('a teacher cannot backdate a class',
    !!(await err(remote.createSession(teach, { ...session, id: 'sess_old', startISO: '2026-01-01T17:00:00Z' }))));
  const del = await teach.from('sessions').delete().eq('id', 'sess_e2e').select();
  check('a teacher cannot delete a class', !del.error && (del.data ?? []).length === 0);
  await raw(teach).from('session_rooms').update({ updated_at: '2000-01-01T00:00:00Z' }).eq('session_id', 'sess_e2e');
  const stamp = (await fetchState(teach, 'abhiram@x.com')).state.sessions.find((x) => x.id === 'sess_e2e').linkUpdatedISO;
  check('the "link changed" time cannot be forged', !stamp || !stamp.startsWith('2000'));
  check('a class link must be a real meeting provider',
    !!(await err(remote.updateMeeting(teach, ['sess_e2e'], { link: 'https://evil.example.com/x' }))));
  await remote.addKudos(s, { id: 'k_fake', tutorId: 'roster-abhiram', from: 'The Principal', message: 'hi', atISO: '' });
  const fake = (await fetchState(anon, null)).state.kudos.find((x) => x.id === 'k_fake');
  check('kudos carry the sender\'s real name', fake?.from === 'Sam');
  // only the team can put a class in the past; nobody can then sign up for it
  await remote.createSession(boss, { ...session, id: 'sess_past', startISO: '2026-01-01T17:00:00Z' });
  const pastErr = await err(remote.joinClass(s, 'sess_past', { email: 'sam@x.com', name: 'Sam' }));
  check('a class that already happened cannot be signed up for', /already happened/.test(pastErr ?? ''), pastErr);

  // ── this round: free groups, paid 1-on-1, one class a week, analytics ──
  const priced = (await fetchState(anon, null)).state.sessions.find((x) => x.id === 'sess_e2e');
  check('group classes are always free (price forced to 0)', !priced?.price);
  const second = await err(remote.createSession(teach, { ...session, id: 'sess_week2', startISO: new Date(Date.now() + 4 * 86400000).toISOString() }));
  check('a teacher can only post one class a week', /one class a week/.test(second ?? ''), second);
  check('a weekly class (7 days later) is fine',
    (await err(remote.createSession(teach, { ...session, id: 'sess_week3', startISO: new Date(Date.now() + 9 * 86400000).toISOString() }))) === null);

  check('a student cannot set a 1-on-1 price', !!(await err(remote.setMyTutoring(s, 15, 'x'))));
  check('a teacher cannot charge more than $20', !!(await err(remote.setMyTutoring(teach, 25, ''))));
  await remote.setMyTutoring(teach, 15, 'Geometry and algebra');
  const t15 = (await fetchState(anon, null)).state.tutors.find((t) => t.id === 'roster-abhiram');
  check('a teacher sets their own 1-on-1 price', t15?.tutoringPrice === 15 && t15?.tutoringNote === 'Geometry and algebra');
  const tr = { id: 'tr_1', tutorId: 'roster-abhiram', studentEmail: 'sam@x.com', studentName: 'Peer 2 Peer Team', message: 'Help with proofs please', times: 'Mon', status: 'new', createdISO: '', parentEmail: 'sams-parent@x.com' };
  check('a 1-on-1 request from an under-18 without a parent email is refused',
    /parent email/i.test((await err(remote.requestTutoring(s, { ...tr, id: 'tr_0', parentEmail: '' }))) ?? ''));
  check('a student can ask for 1-on-1', (await err(remote.requestTutoring(s, tr))) === null);
  check('nobody can ask as someone else', !!(await err(remote.requestTutoring(o, { ...tr, id: 'tr_2' }))));
  check('cannot ask a teacher who offers no 1-on-1',
    /isn't offering/.test((await err(remote.requestTutoring(s, { ...tr, id: 'tr_3', tutorId: 'roster-sohail' }))) ?? ''));
  check('the teacher sees the request', (await fetchState(teach, 'abhiram@x.com')).state.tutoringRequests?.some((r) => r.id === 'tr_1'));
  check('another student does not', !(await fetchState(o, 'olu@x.com')).state.tutoringRequests?.some((r) => r.id === 'tr_1'));
  check('visitors do not', (await anon.from('tutoring_requests').select('*')).data?.length === 0);
  await remote.setTutoringStatus(teach, 'tr_1', 'accepted');
  await teach.from('tutoring_requests').update({ message: 'changed by teacher' }).eq('id', 'tr_1');
  const tr1 = (await fetchState(s, 'sam@x.com')).state.tutoringRequests?.find((r) => r.id === 'tr_1');
  check('the teacher can accept, but not rewrite the request', tr1?.status === 'accepted' && tr1?.message === 'Help with proofs please');
  await remote.setTutoringStatus(s, 'tr_1', 'done');
  check('a student cannot change the status', (await fetchState(s, 'sam@x.com')).state.tutoringRequests?.find((r) => r.id === 'tr_1')?.status === 'accepted');
  check("the student's name comes from their profile, not the request", tr1?.studentName !== 'Peer 2 Peer Team', tr1?.studentName);
  check('a request needs a real message', /little about/.test((await err(remote.requestTutoring(s, { ...tr, id: 'tr_5', message: 'hi' }))) ?? ''));
  check('a teacher cannot ask themselves', !!(await err(remote.requestTutoring(teach, { ...tr, id: 'tr_6', studentEmail: 'abhiram@x.com' }))));
  check('the teacher can mark it finished', (await err(remote.setTutoringStatus(teach, 'tr_1', 'done'))) === null);
  check('a finished request cannot go back to new', !!(await err(remote.setTutoringStatus(teach, 'tr_1', 'new'))));

  // ── attendance: hours come from who came, not who signed up ──
  check('a student cannot mark attendance', !!(await err(remote.markAttendance(s, 'sess_e2e', 'olu@x.com', true))));
  await remote.markAttendance(teach, 'sess_e2e', 'olu@x.com', true);
  st = await fetchState(boss, 'boss@x.com');
  check('the teacher marks who came', st.state.sessions.find((x) => x.id === 'sess_e2e')?.attendees.some((a) => a.email === 'olu@x.com' && a.attended));

  // ── teachers editing their own card ──
  await remote.setMyProfile(teach, 'Geometry, gently', '10th grade', 'Tues 6-8pm');
  const card = (await fetchState(anon, null)).state.tutors.find((t) => t.id === 'roster-abhiram');
  check('a teacher edits their own card', card?.tagline === 'Geometry, gently' && card?.availability === 'Tues 6-8pm');
  check('a student cannot edit a teacher card', !!(await err(remote.setMyProfile(s, 'x', 'y', 'z'))));

  const ev = { visitor_id: 'visitor-12345', session_id: 'session-12345', kind: 'pageview', path: '/' };
  check('a visitor can record a page view', !(await anon.from('events').insert(ev)).error);
  check('a visitor cannot choose the time or email of an event',
    !!(await anon.from('events').insert({ ...ev, user_email: 'fake@x.com' })).error &&
    !!(await anon.from('events').insert({ ...ev, at: '2000-01-01T00:00:00Z' })).error);
  check('a visitor cannot read analytics', ((await anon.from('events').select('*')).data ?? []).length === 0);
  check('a student cannot read analytics', ((await s.from('events').select('*')).data ?? []).length === 0);
  await s.from('events').insert({ ...ev, session_id: 'session-67890' });
  const seen = await remote.fetchEvents(boss, '1999-01-01T00:00:00Z');
  check('the admin reads analytics', seen.length >= 2);
  check('event time and email come from the server, not the visitor',
    seen.every((e) => !e.at.startsWith('2000')) && seen.find((e) => e.session_id === 'session-12345')?.user_email == null &&
    seen.find((e) => e.session_id === 'session-67890')?.user_email === 'sam@x.com');
  check('junk event types are refused', !!(await s.from('events').insert({ ...ev, kind: 'hack' })).error);
  await anon.from('events').insert({ ...ev, kind: 'hack', session_id: 'session-junk' });
  check('junk events from visitors are not stored', !(await remote.fetchEvents(boss, '1999-01-01T00:00:00Z')).some((e) => e.session_id === 'session-junk'));
  await anon.from('events').insert({ ...ev, kind: 'signin', session_id: 'session-fake-signin' });
  await s.from('events').insert({ ...ev, kind: 'rsvp', session_id: 'session-real-rsvp' });
  const after = await remote.fetchEvents(boss, '1999-01-01T00:00:00Z');
  check('a made-up sign-in from a visitor is dropped', !after.some((e) => e.session_id === 'session-fake-signin'));
  check("a signed-in student's action is kept", after.some((e) => e.session_id === 'session-real-rsvp'));
  check('more than 50 events in one request are refused',
    !!(await anon.from('events').insert(Array.from({ length: 51 }, () => ({ ...ev })))).error);
  // rows sent together share a time; paging must still return each row once
  for (let i = 0; i < 26; i++) {
    await anon.from('events').insert(Array.from({ length: 50 }, (_, j) => ({ ...ev, label: `L${i * 50 + j}` })));
  }
  const many = await remote.fetchEvents(boss, '1999-01-01T00:00:00Z');
  const labels = many.filter((e) => /^L\d+$/.test(e.label ?? '')).map((e) => e.label);
  check('analytics paging returns every row exactly once', labels.length === 1300 && new Set(labels).size === 1300, `${labels.length} rows, ${new Set(labels).size} unique`);

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
