-- Peer 2 Peer database. Paste this whole file into Supabase → SQL Editor → Run.
-- It is safe to run again: everything is "create if not exists" or replaced.
--
-- Who can do what is enforced here, by row-level security, not by the
-- website. The website's key is public, so these rules are the real lock.
--
--   anyone            sees teachers, classes and seat counts
--   signed-in user    saves spots, sees meeting links for classes they're in
--   teacher           posts classes and edits their own meeting links
--   admin             sees and changes everything (emails in public.admins)

-- ── tables ───────────────────────────────────────────────────

create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

create table if not exists public.profiles (
  email       text primary key check (email = lower(email)),
  name        text not null check (char_length(name) between 1 and 80),
  age         int check (age between 13 and 120),
  role        text not null default 'student' check (role in ('student', 'tutor')),
  blocked     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Existing databases still have the old 5..120 check: drop it and apply the
-- 13+ floor to new and changed rows (rows already stored are left alone).
alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_min13
  check (age is null or age between 13 and 120) not valid;

create table if not exists public.tutors (
  id            text primary key,
  name          text not null,
  grade         text not null default '',
  tagline       text not null default '',
  subjects      text[] not null default '{}',
  joined_at     timestamptz not null default now(),
  hue           int not null default 200,
  courses       jsonb not null default '[]',
  availability  text,
  is_founder    boolean not null default false,
  -- false once a teacher leaves: hidden from the site, past hours kept
  active        boolean not null default true
);

alter table public.tutors add column if not exists active boolean not null default true;

-- 1-on-1 tutoring: group classes are always free, but a teacher can offer
-- private sessions at a price they choose, up to $20. null = not offered.
alter table public.tutors add column if not exists tutoring_price int;
alter table public.tutors add column if not exists tutoring_note text;
alter table public.tutors drop constraint if exists tutors_tutoring_price;
alter table public.tutors add constraint tutors_tutoring_price
  check (tutoring_price is null or tutoring_price between 1 and 20);

-- A student asking a teacher for 1-on-1 tutoring. The teacher arranges the
-- time and payment directly with them.
create table if not exists public.tutoring_requests (
  id             text primary key,
  tutor_id       text not null references public.tutors (id) on delete cascade,
  student_email  text not null check (student_email = lower(student_email)),
  student_name   text not null check (char_length(student_name) between 1 and 80),
  message        text not null default '' check (char_length(message) <= 1000),
  times          text not null default '' check (char_length(times) <= 200),
  -- a parent or guardian's email; required under 18 (checked in the trigger)
  parent_email   text,
  status         text not null default 'new' check (status in ('new', 'accepted', 'declined', 'done')),
  created_at     timestamptz not null default now()
);

-- Kept apart from tutors so teachers' emails are never public.
create table if not exists public.tutor_emails (
  tutor_id  text primary key references public.tutors (id) on delete cascade,
  email     text not null unique check (email = lower(email))
);

-- A parent or guardian's email, required for 1-on-1 requests from students
-- under 18 (checked in the guard trigger). The teacher emails the family
-- directly, so an adult has to be on the thread.
alter table public.tutoring_requests add column if not exists parent_email text;

create table if not exists public.sessions (
  id            text primary key,
  title         text not null check (char_length(title) between 1 and 120),
  subject       text not null,
  level         text not null default 'all' check (level in ('intro', 'intermediate', 'all')),
  description   text not null default '',
  tutor_id      text not null references public.tutors (id) on delete cascade,
  start_at      timestamptz not null,
  duration_min  int not null check (duration_min between 10 and 300),
  capacity      int not null check (capacity between 1 and 500),
  min_age       int not null default 13 check (min_age between 13 and 25),
  -- dollars per student; 0 = free. The site shows it, it doesn't take payment.
  price         int not null default 0 check (price between 0 and 19),
  status        text not null default 'scheduled' check (status in ('scheduled', 'canceled')),
  created_at    timestamptz not null default now()
);

alter table public.sessions drop constraint if exists sessions_min_age_check;
alter table public.sessions add constraint sessions_min_age_13
  check (min_age between 13 and 25) not valid;

alter table public.sessions add column if not exists price int not null default 0
  check (price between 0 and 19);

-- Meeting details live apart from sessions so only people in the class
-- (plus the teacher and admins) can read them.
create table if not exists public.session_rooms (
  session_id  text primary key references public.sessions (id) on delete cascade,
  link        text not null check (link ~* '^https://'),
  meeting_id  text,
  passcode    text,
  updated_at  timestamptz            -- null until the teacher changes the link
);

create table if not exists public.signups (
  session_id  text not null references public.sessions (id) on delete cascade,
  email       text not null check (email = lower(email)),
  name        text not null,
  waitlist    boolean not null default false,
  -- ticked by the teacher (or an admin) after the class happens; volunteer
  -- hours only count students who were actually there
  attended    boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (session_id, email)
);

alter table public.signups add column if not exists attended boolean not null default false;

create table if not exists public.applications (
  id              text primary key,
  email           text not null check (email = lower(email)),
  name            text not null,
  grade           text not null default '',
  subjects        text[] not null default '{}',
  why             text not null default '',
  availability    text[] not null default '{}',
  course_title    text,
  course_summary  text,
  times           text,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  submitted_at    timestamptz not null default now()
);

create table if not exists public.certifications (
  email      text not null check (email = lower(email)),
  subject    text not null,
  score      int not null,
  total      int not null,
  earned_at  timestamptz not null default now(),
  primary key (email, subject)
);

create table if not exists public.kudos (
  id         text primary key,
  tutor_id   text not null references public.tutors (id) on delete cascade,
  from_name  text not null check (char_length(from_name) between 1 and 80),
  message    text not null check (char_length(message) between 1 and 500),
  at         timestamptz not null default now()
);

create table if not exists public.requests (
  id         text primary key,
  topic      text not null check (char_length(topic) between 1 and 160),
  subject    text not null,
  by_name    text not null,
  votes      int not null default 1,
  voted_by   text[] not null default '{}',
  at         timestamptz not null default now()
);

-- Site analytics: one row per page view, click, page exit or key action.
-- Anyone can add rows (that's how a visit is recorded); only admins can
-- read them. No IP addresses are stored.
create table if not exists public.events (
  id           bigserial primary key,
  at           timestamptz not null default now(),
  visitor_id   text not null check (char_length(visitor_id) between 8 and 64),
  session_id   text not null check (char_length(session_id) between 8 and 64),
  kind         text not null check (kind in ('pageview', 'click', 'leave', 'signin', 'rsvp', 'apply', 'tutoring', 'kudos', 'request')),
  path         text check (char_length(path) <= 300),
  label        text check (char_length(label) <= 200),
  href         text check (char_length(href) <= 500),
  referrer     text check (char_length(referrer) <= 500),
  source       text check (char_length(source) <= 100),
  medium       text check (char_length(medium) <= 100),
  campaign     text check (char_length(campaign) <= 100),
  landing      text check (char_length(landing) <= 300),
  device       text check (char_length(device) <= 20),
  browser      text check (char_length(browser) <= 40),
  os           text check (char_length(os) <= 40),
  screen       text check (char_length(screen) <= 20),
  lang         text check (char_length(lang) <= 20),
  tz           text check (char_length(tz) <= 60),
  duration_ms  int check (duration_ms between 0 and 86400000),
  user_email   text
);
create index if not exists events_at on public.events (at desc);

-- ── helpers ──────────────────────────────────────────────────
-- security definer: they read tables the caller can't, and return only
-- a yes/no or a count.

create or replace function public.my_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = my_email())
$$;

create or replace function public.my_tutor_id() returns text
language sql stable security definer set search_path = public as $$
  select tutor_id from tutor_emails where email = my_email()
$$;

create or replace function public.teaches(sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sessions where id = sid and tutor_id = my_tutor_id())
$$;

create or replace function public.not_blocked() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where email = my_email() and blocked)
$$;

create or replace function public.in_class(sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select not_blocked() and exists (
    select 1 from signups where session_id = sid and email = my_email() and not waitlist
  )
$$;

-- Seat counts for everyone, plus where the caller stands, without
-- exposing anyone else's name or email.
create or replace function public.session_counts()
returns table (session_id text, going int, waiting int, my_status text, my_wait_pos int)
language sql stable security definer set search_path = public as $$
  select s.id,
    (select count(*) from signups g where g.session_id = s.id and not g.waitlist)::int,
    (select count(*) from signups w where w.session_id = s.id and w.waitlist)::int,
    (select case when m.waitlist then 'waiting' else 'going' end
       from signups m where m.session_id = s.id and m.email = my_email()),
    (select r.pos::int from (
       select email, row_number() over (order by created_at) as pos
       from signups w where w.session_id = s.id and w.waitlist
     ) r where r.email = my_email())
  from sessions s
$$;

create or replace function public.vote_request(rid text) returns void
language sql security definer set search_path = public as $$
  update requests
     set votes = votes + 1, voted_by = array_append(voted_by, my_email())
   where id = rid and my_email() <> '' and not_blocked() and not (my_email() = any (voted_by))
$$;

-- A teacher (or an admin) marking whether a student actually came to a class.
-- Only flips the attended flag; nobody's name or seat changes.
create or replace function public.set_attendance(sid text, s_email text, a boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or teaches(sid)) then
    raise exception 'Only the teacher running the class, or the team, can mark attendance.';
  end if;
  update signups set attended = a where session_id = sid and email = lower(s_email);
end $$;

-- ── rules on signups ─────────────────────────────────────────

create or replace function public.check_signup() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s sessions%rowtype;
  p profiles%rowtype;
  taken int;
begin
  -- Checked first, so the messages below never reveal anything about
  -- someone else's account (their age, or whether they're blocked).
  if not is_admin() and new.email <> my_email() then
    raise exception 'You can only save a spot for yourself.';
  end if;
  -- Lock the class row: two people grabbing the last seat at the same
  -- moment take turns here instead of both getting in.
  select * into s from sessions where id = new.session_id for update;
  if not found or s.status <> 'scheduled' then
    raise exception 'This class was canceled.';
  end if;
  if s.start_at + make_interval(mins => s.duration_min) < now() then
    raise exception 'This class has already happened.';
  end if;
  if is_admin() then
    return new;
  end if;
  select * into p from profiles where email = new.email;
  if p.blocked then
    raise exception 'This account cannot save spots. Contact the team.';
  end if;
  new.name := coalesce(p.name, new.name);
  if p.age is null or p.age < s.min_age then
    raise exception 'This class is for ages %+.', s.min_age;
  end if;
  select count(*) into taken from signups where session_id = new.session_id and not waitlist;
  -- nobody waits for a class with free seats
  if new.waitlist and taken < s.capacity then
    new.waitlist := false;
  end if;
  if not new.waitlist then
    if taken >= s.capacity then
      raise exception 'That class is full. Join the waitlist instead.';
    end if;
  end if;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists signup_rules on public.signups;
create trigger signup_rules before insert on public.signups
  for each row execute function public.check_signup();

-- When someone with a seat leaves, the first person waiting moves up.
create or replace function public.promote_waitlist() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not old.waitlist then
    update signups set waitlist = false
     where (session_id, email) = (
       select session_id, email from signups
        where session_id = old.session_id and waitlist
          and email not in (select email from profiles where blocked)
        order by created_at limit 1
     );
  end if;
  return old;
end $$;

drop trigger if exists signup_promote on public.signups;
create trigger signup_promote after delete on public.signups
  for each row execute function public.promote_waitlist();

-- Only admins can block or unblock someone.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() and new.blocked is distinct from coalesce(old.blocked, false) then
    raise exception 'Only the team can change that.';
  end if;
  if not is_admin() and tg_op = 'UPDATE' and old.age is not null
     and new.age is distinct from old.age then
    raise exception 'To change your age, email the team.';
  end if;
  return new;
end $$;

drop trigger if exists profile_guard on public.profiles;
create trigger profile_guard before insert or update on public.profiles
  for each row execute function public.guard_profile();

-- Stamp link changes, so students can see the link was updated.
create or replace function public.stamp_room() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := null;
  elsif new.link is distinct from old.link
     or new.meeting_id is distinct from old.meeting_id
     or new.passcode is distinct from old.passcode then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

drop trigger if exists room_stamp on public.session_rooms;
create trigger room_stamp before insert or update on public.session_rooms
  for each row execute function public.stamp_room();

-- Same list of providers the website accepts. NOT VALID: applies to new and
-- changed rows without failing on anything already saved.
alter table public.session_rooms drop constraint if exists session_rooms_provider;
alter table public.session_rooms add constraint session_rooms_provider check (
  link ~* '^https://(meet\.google\.com|([a-z0-9-]+\.)?zoom\.(us|com)|teams\.(microsoft|live)\.com|meet\.jit\.si|discord\.(gg|com))(/|$)'
) not valid;

-- ── rules on classes for teachers ────────────────────────────
-- Teachers manage their own upcoming classes. They can't backdate a class
-- (which would add volunteer hours), edit one that already happened, bring
-- back a class the team canceled, or shrink it below who's signed up.
create or replace function public.guard_session() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  seated int;
begin
  -- group classes are always free; 1-on-1 tutoring is where prices live
  new.price := 0;
  -- one at a time per teacher, so two quick posts can't both pass the weekly check
  perform 1 from tutors where id = new.tutor_id for update;
  if is_admin() then
    return new;
  end if;
  -- teachers start with one class a week: no two of their classes within
  -- six days of each other (a weekly series is seven days apart)
  if exists (
    select 1 from sessions o
     where o.tutor_id = new.tutor_id and o.id <> new.id and o.status = 'scheduled'
       and abs(extract(epoch from (o.start_at - new.start_at))) < 6 * 86400
  ) and (tg_op = 'INSERT' or new.start_at is distinct from old.start_at) then
    raise exception 'Teachers run one class a week to start. You already have one within six days of that.';
  end if;
  if tg_op = 'INSERT' then
    if new.start_at < now() then
      raise exception 'Classes have to be in the future.';
    end if;
    new.status := 'scheduled';
    new.created_at := now();
    return new;
  end if;
  if old.start_at < now() then
    raise exception 'A class that already started can''t be changed.';
  end if;
  if new.start_at < now() then
    raise exception 'Classes have to be in the future.';
  end if;
  if old.status = 'canceled' and new.status <> 'canceled' then
    raise exception 'Only the team can bring back a canceled class.';
  end if;
  new.created_at := old.created_at;
  select count(*) into seated from signups where session_id = old.id and not waitlist;
  if new.capacity < seated then
    raise exception 'That''s fewer seats than people already signed up (%).', seated;
  end if;
  return new;
end $$;

drop trigger if exists session_guard on public.sessions;
create trigger session_guard before insert or update on public.sessions
  for each row execute function public.guard_session();

-- ── kudos and requests: real time, real name, real subject ───
create or replace function public.stamp_note() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who text;
begin
  if is_admin() then
    return new;
  end if;
  select name into who from profiles where email = my_email();
  if who is null then
    raise exception 'Finish your profile first.';
  end if;
  perform pg_advisory_xact_lock(hashtext(tg_table_name || ':' || my_email()));
  if tg_table_name = 'kudos' then
    if (select count(*) from kudos where from_name = who and at > now() - interval '1 day') >= 10 then
      raise exception 'That''s a lot of thank-yous for one day. Try again tomorrow.';
    end if;
  elsif (select count(*) from requests where by_name = who and at > now() - interval '1 day') >= 10 then
    raise exception 'That''s a lot of requests for one day. Try again tomorrow.';
  end if;
  new.at := now();
  if tg_table_name = 'kudos' then
    new.from_name := coalesce(who, new.from_name);
  else
    new.by_name := coalesce(who, new.by_name);
  end if;
  return new;
end $$;

drop trigger if exists kudos_stamp on public.kudos;
create trigger kudos_stamp before insert on public.kudos
  for each row execute function public.stamp_note();
drop trigger if exists requests_stamp on public.requests;
create trigger requests_stamp before insert on public.requests
  for each row execute function public.stamp_note();

alter table public.requests drop constraint if exists requests_subject;
alter table public.requests add constraint requests_subject check (subject in (
  'python', 'webdev', 'ai', 'math', 'physics', 'chemistry', 'biology', 'english',
  'history', 'spanish', 'testprep', 'cad', 'other'
)) not valid;

-- Quizzes are graded in the browser, so at least keep scores sane.
alter table public.certifications drop constraint if exists certifications_sane;
alter table public.certifications add constraint certifications_sane check (
  subject in ('python', 'ai') and total between 1 and 50 and score between 0 and total
) not valid;

-- A teacher turns 1-on-1 tutoring on or off and sets the price ($1-$20).
create or replace function public.set_my_tutoring(p int, n text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_tutor_id() is null then
    raise exception 'Only teachers can offer 1-on-1 tutoring.';
  end if;
  if p is not null and (p < 1 or p > 20) then
    raise exception 'Pick a price from $1 to $20.';
  end if;
  update tutors set tutoring_price = p, tutoring_note = left(coalesce(n, ''), 300)
   where id = my_tutor_id();
end $$;

-- A teacher editing their own card: tagline, grade and availability.
-- Everything else (name, subjects, active) stays with the team.
create or replace function public.set_my_profile(t text, g text, a text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_tutor_id() is null then
    raise exception 'Only teachers can edit a teacher card.';
  end if;
  update tutors
     set tagline = left(btrim(coalesce(t, '')), 140),
         grade = left(btrim(coalesce(g, '')), 40),
         availability = nullif(left(btrim(coalesce(a, '')), 80), '')
   where id = my_tutor_id();
end $$;

-- On a 1-on-1 request, a teacher may only change its status; the student's
-- details stay as they sent them. New requests always start as 'new'.
create or replace function public.guard_tutoring_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'new';
    new.created_at := now();
    select name into new.student_name from profiles where email = my_email();
    if not found then
      raise exception 'Finish your profile first.';
    end if;
    -- anyone under 18 needs a parent on the request: the teacher emails privately
    if coalesce((select age from profiles where email = my_email()), 0) < 18 then
      if new.parent_email is null or new.parent_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'A parent email is required for students under 18.';
      end if;
      new.parent_email := lower(new.parent_email);
    end if;
    perform pg_advisory_xact_lock(hashtext('tutreq:' || new.student_email));
    if not exists (select 1 from tutors where id = new.tutor_id and tutoring_price is not null and active) then
      raise exception 'That teacher isn''t offering 1-on-1 tutoring right now.';
    end if;
    if exists (select 1 from tutor_emails where tutor_id = new.tutor_id and email = my_email()) then
      raise exception 'That''s your own 1-on-1 offer.';
    end if;
    if char_length(btrim(coalesce(new.message, ''))) < 10 then
      raise exception 'Tell them a little about what you need help with.';
    end if;
    if (select count(*) from tutoring_requests
         where student_email = new.student_email and created_at > now() - interval '1 day') >= 5 then
      raise exception 'That''s a lot of requests for one day. Try again tomorrow.';
    end if;
    return new;
  end if;
  new.id := old.id;
  new.tutor_id := old.tutor_id;
  new.student_email := old.student_email;
  new.student_name := old.student_name;
  new.message := old.message;
  new.times := old.times;
  new.parent_email := old.parent_email;
  new.created_at := old.created_at;
  -- requests only move forward: new → accepted/declined, accepted → done/declined
  if new.status is distinct from old.status and not (
       (old.status = 'new' and new.status in ('accepted', 'declined'))
    or (old.status = 'accepted' and new.status in ('done', 'declined'))
  ) then
    raise exception 'That request can''t go back to %.', new.status;
  end if;
  return new;
end $$;

drop trigger if exists tutoring_request_guard on public.tutoring_requests;
create trigger tutoring_request_guard before insert or update on public.tutoring_requests
  for each row execute function public.guard_tutoring_request();

-- The server decides the time and who was signed in; a visitor can't fake
-- either.
create or replace function public.stamp_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.at := now();
  new.user_email := nullif(my_email(), '');
  -- sign-ins, signups, applications and so on only come from signed-in
  -- people, so an anonymous one is made up: drop it quietly
  if new.kind not in ('pageview', 'click', 'leave') and new.user_email is null then
    return null;
  end if;
  return new;
end $$;

drop trigger if exists event_stamp on public.events;
create trigger event_stamp before insert on public.events
  for each row execute function public.stamp_event();

-- Blocking someone takes them out of their upcoming classes too (the
-- waitlist trigger then moves the next person up).
create or replace function public.on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.blocked and not coalesce(old.blocked, false) then
    delete from signups s using sessions x
     where s.email = new.email and x.id = s.session_id and x.start_at > now();
  end if;
  return null;
end $$;

drop trigger if exists profile_block on public.profiles;
create trigger profile_block after update of blocked on public.profiles
  for each row execute function public.on_block();

-- Analytics can't be used to fill the database: at most 50 events per
-- request, and a ceiling on how many arrive in ten minutes. Hitting the
-- ceiling only loses analytics for a while, never the rest of the site.
-- Empty the table now and then (see SUPABASE.md): Supabase's free tier
-- gives 500 MB and nobody wants to spend it on analytics.
create or replace function public.cap_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from new_rows) > 50 then
    raise exception 'Too many events at once.';
  end if;
  if (select count(*) from events where at > now() - interval '10 minutes') > 1000 then
    raise exception 'Analytics is busy.';
  end if;
  return null;
end $$;

drop trigger if exists events_cap on public.events;
create trigger events_cap after insert on public.events
  referencing new table as new_rows for each statement execute function public.cap_events();

-- No giant text anywhere people can type. NOT VALID: checked on new and
-- changed rows only.
alter table public.signups drop constraint if exists signups_name_len;
alter table public.signups add constraint signups_name_len check (char_length(name) between 1 and 80) not valid;
alter table public.applications drop constraint if exists applications_sizes;
alter table public.applications add constraint applications_sizes check (
  char_length(name) between 1 and 80 and char_length(grade) <= 40 and char_length(why) <= 2000
  and char_length(coalesce(course_title, '')) <= 120 and char_length(coalesce(course_summary, '')) <= 2000
  and char_length(coalesce(times, '')) <= 300 and cardinality(subjects) <= 20 and cardinality(availability) <= 50
) not valid;
alter table public.sessions drop constraint if exists sessions_text_len;
alter table public.sessions add constraint sessions_text_len
  check (char_length(description) <= 2000 and char_length(subject) <= 40) not valid;

-- Who voted for a topic stays private: everyone sees the count, and each
-- person can ask which topics they voted for.
create or replace function public.my_votes() returns setof text
language sql stable security definer set search_path = public as $$
  select id from requests where my_email() <> '' and my_email() = any (voted_by)
$$;

-- ── row-level security ───────────────────────────────────────

alter table public.admins         enable row level security;
alter table public.profiles       enable row level security;
alter table public.tutors         enable row level security;
alter table public.tutor_emails   enable row level security;
alter table public.sessions       enable row level security;
alter table public.session_rooms  enable row level security;
alter table public.signups        enable row level security;
alter table public.applications   enable row level security;
alter table public.certifications enable row level security;
alter table public.kudos          enable row level security;
alter table public.requests       enable row level security;
alter table public.tutoring_requests enable row level security;
alter table public.events         enable row level security;

do $$
declare r record;
begin
  -- start from a clean slate so re-running never stacks old policies
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy admins_self on public.admins for select using (email = my_email() or is_admin());

create policy profiles_read  on public.profiles for select using (email = my_email() or is_admin());
create policy profiles_new   on public.profiles for insert
  with check (my_email() <> '' and email = my_email());
create policy profiles_edit  on public.profiles for update
  using (email = my_email() or is_admin())
  with check (email = my_email() or is_admin());
create policy profiles_admin on public.profiles for delete using (is_admin());

create policy tutors_read  on public.tutors for select using (true);
create policy tutors_admin on public.tutors for all using (is_admin()) with check (is_admin());

create policy temail_read  on public.tutor_emails for select using (is_admin() or email = my_email());
create policy temail_admin on public.tutor_emails for all using (is_admin()) with check (is_admin());

create policy sessions_read on public.sessions for select using (true);
create policy sessions_new on public.sessions for insert
  with check (is_admin() or tutor_id = my_tutor_id());
create policy sessions_edit on public.sessions for update
  using (is_admin() or tutor_id = my_tutor_id())
  with check (is_admin() or tutor_id = my_tutor_id());
-- teachers cancel instead; deleting would erase signups and hours
create policy sessions_delete on public.sessions for delete using (is_admin());

create policy rooms_read on public.session_rooms for select
  using (is_admin() or teaches(session_id) or in_class(session_id));
create policy rooms_add  on public.session_rooms for insert with check (is_admin() or teaches(session_id));
create policy rooms_edit on public.session_rooms for update
  using (is_admin() or teaches(session_id)) with check (is_admin() or teaches(session_id));
-- deleting and re-adding would hide the "new link" notice from students
create policy rooms_del  on public.session_rooms for delete using (is_admin());

create policy signups_read on public.signups for select
  using (email = my_email() or is_admin() or teaches(session_id));
create policy signups_join on public.signups for insert
  with check ((my_email() <> '' and email = my_email()) or is_admin());
create policy signups_leave on public.signups for delete
  using (email = my_email() or is_admin() or teaches(session_id));
create policy signups_admin on public.signups for update using (is_admin()) with check (is_admin());

create policy apps_read  on public.applications for select using (email = my_email() or is_admin());
create policy apps_new   on public.applications for insert
  with check (my_email() <> '' and email = my_email() and status = 'pending' and not_blocked());
create policy apps_mine  on public.applications for update
  using (email = my_email() and status = 'pending')
  with check (email = my_email() and status = 'pending');
create policy apps_admin on public.applications for all using (is_admin()) with check (is_admin());

create policy certs_read  on public.certifications for select using (email = my_email() or is_admin());
create policy certs_write on public.certifications for insert
  with check (my_email() <> '' and email = my_email() and not_blocked());
create policy certs_redo  on public.certifications for update
  using (email = my_email()) with check (email = my_email() and not_blocked());

create policy kudos_read  on public.kudos for select using (true);
create policy kudos_new   on public.kudos for insert with check (my_email() <> '' and not_blocked());
create policy kudos_admin on public.kudos for delete using (is_admin());

create policy req_read  on public.requests for select using (true);
create policy req_new   on public.requests for insert
  with check (my_email() <> '' and not_blocked() and votes = 1 and voted_by = array[my_email()]);
create policy req_admin on public.requests for all using (is_admin()) with check (is_admin());

create policy tutreq_read on public.tutoring_requests for select
  using (student_email = my_email() or tutor_id = my_tutor_id() or is_admin());
create policy tutreq_new on public.tutoring_requests for insert
  with check (my_email() <> '' and student_email = my_email() and not_blocked());
create policy tutreq_status on public.tutoring_requests for update
  using (tutor_id = my_tutor_id() or is_admin())
  with check (tutor_id = my_tutor_id() or is_admin());
create policy tutreq_admin on public.tutoring_requests for delete using (is_admin());

create policy events_add  on public.events for insert with check (true);
create policy events_read on public.events for select using (is_admin());
create policy events_drop on public.events for delete using (is_admin());

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
-- visitors who aren't signed in can record their visit, nothing else
-- only the columns the site sends: nobody picks an id, a time or an email
revoke insert on public.events from anon, authenticated;
grant insert (visitor_id, session_id, kind, path, label, href, referrer, source, medium,
              campaign, landing, device, browser, os, screen, lang, tz, duration_ms)
  on public.events to anon, authenticated;
grant usage on sequence public.events_id_seq to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- voted_by holds emails: readable only through my_votes()
revoke select on public.requests from anon, authenticated;
grant select (id, topic, subject, by_name, votes, at) on public.requests to anon, authenticated;

-- ── live updates ─────────────────────────────────────────────
-- Lets an open page hear about a changed link or a new signup straight away.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.sessions, public.session_rooms, public.signups;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ── one-off data fixes (safe to run again) ───────────────────
-- Every current teacher is in 10th grade; no titles like "Co-founder" or
-- "High school senior"; the founder's old tagline goes.
update public.tutors set grade = '10th grade'
 where id in ('founder', 'roster-sohail', 'roster-abhiram', 'roster-akil', 'roster-haggai', 'roster-ayden')
   and grade <> '10th grade';
update public.tutors set tagline = ''
 where tagline = 'Started this after charging for tutoring stopped feeling right.';

-- ── under-13 accounts ─────────────────────────────────────────
-- Sign-up is 13+ (COPPA). Profiles already stored with an age under 13
-- stay until you choose to remove them — if you want them gone:
--   delete from signups where email in (select email from profiles where age < 13);
--   delete from profiles where age < 13;
