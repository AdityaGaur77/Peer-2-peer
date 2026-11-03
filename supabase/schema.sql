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
  age         int check (age between 5 and 120),
  role        text not null default 'student' check (role in ('student', 'tutor')),
  blocked     boolean not null default false,
  created_at  timestamptz not null default now()
);

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

-- Kept apart from tutors so teachers' emails are never public.
create table if not exists public.tutor_emails (
  tutor_id  text primary key references public.tutors (id) on delete cascade,
  email     text not null unique check (email = lower(email))
);

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
  min_age       int not null default 13 check (min_age between 5 and 25),
  -- dollars per student; 0 = free. The site shows it, it doesn't take payment.
  price         int not null default 0 check (price between 0 and 19),
  status        text not null default 'scheduled' check (status in ('scheduled', 'canceled')),
  created_at    timestamptz not null default now()
);

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
  created_at  timestamptz not null default now(),
  primary key (session_id, email)
);

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

create or replace function public.in_class(sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
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
   where id = rid and my_email() <> '' and not (my_email() = any (voted_by))
$$;

-- ── rules on signups ─────────────────────────────────────────

create or replace function public.check_signup() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s sessions%rowtype;
  p profiles%rowtype;
  taken int;
begin
  select * into s from sessions where id = new.session_id;
  if s.status <> 'scheduled' then
    raise exception 'This class was canceled.';
  end if;
  if is_admin() then
    return new;
  end if;
  select * into p from profiles where email = new.email;
  if p.blocked then
    raise exception 'This account cannot save spots. Contact the team.';
  end if;
  if p.age is null or p.age < s.min_age then
    raise exception 'This class is for ages %+.', s.min_age;
  end if;
  if not new.waitlist then
    select count(*) into taken from signups where session_id = new.session_id and not waitlist;
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
  return new;
end $$;

drop trigger if exists profile_guard on public.profiles;
create trigger profile_guard before insert or update on public.profiles
  for each row execute function public.guard_profile();

-- Stamp link changes, so students can see the link was updated.
create or replace function public.stamp_room() returns trigger
language plpgsql as $$
begin
  if new.link is distinct from old.link
     or new.meeting_id is distinct from old.meeting_id
     or new.passcode is distinct from old.passcode then
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists room_stamp on public.session_rooms;
create trigger room_stamp before update on public.session_rooms
  for each row execute function public.stamp_room();

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
create policy profiles_new   on public.profiles for insert with check (email = my_email());
create policy profiles_edit  on public.profiles for update
  using (email = my_email() or is_admin())
  with check (email = my_email() or is_admin());
create policy profiles_admin on public.profiles for delete using (is_admin());

create policy tutors_read  on public.tutors for select using (true);
create policy tutors_admin on public.tutors for all using (is_admin()) with check (is_admin());

create policy temail_read  on public.tutor_emails for select using (is_admin() or email = my_email());
create policy temail_admin on public.tutor_emails for all using (is_admin()) with check (is_admin());

create policy sessions_read on public.sessions for select using (true);
create policy sessions_write on public.sessions for all
  using (is_admin() or tutor_id = my_tutor_id())
  with check (is_admin() or tutor_id = my_tutor_id());

create policy rooms_read on public.session_rooms for select
  using (is_admin() or teaches(session_id) or in_class(session_id));
create policy rooms_write on public.session_rooms for all
  using (is_admin() or teaches(session_id))
  with check (is_admin() or teaches(session_id));

create policy signups_read on public.signups for select
  using (email = my_email() or is_admin() or teaches(session_id));
create policy signups_join on public.signups for insert
  with check (email = my_email() or is_admin());
create policy signups_leave on public.signups for delete
  using (email = my_email() or is_admin() or teaches(session_id));
create policy signups_admin on public.signups for update using (is_admin()) with check (is_admin());

create policy apps_read  on public.applications for select using (email = my_email() or is_admin());
create policy apps_new   on public.applications for insert
  with check (email = my_email() and status = 'pending');
create policy apps_mine  on public.applications for update
  using (email = my_email() and status = 'pending')
  with check (email = my_email() and status = 'pending');
create policy apps_admin on public.applications for all using (is_admin()) with check (is_admin());

create policy certs_read  on public.certifications for select using (email = my_email() or is_admin());
create policy certs_write on public.certifications for insert with check (email = my_email());
create policy certs_redo  on public.certifications for update
  using (email = my_email()) with check (email = my_email());

create policy kudos_read  on public.kudos for select using (true);
create policy kudos_new   on public.kudos for insert with check (my_email() <> '');
create policy kudos_admin on public.kudos for delete using (is_admin());

create policy req_read  on public.requests for select using (true);
create policy req_new   on public.requests for insert
  with check (my_email() <> '' and votes = 1 and voted_by = array[my_email()]);
create policy req_admin on public.requests for all using (is_admin()) with check (is_admin());

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;

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
