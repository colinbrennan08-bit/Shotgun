-- Shotgun schema.
--
-- Run this once, whole, in the Supabase SQL editor.
--
-- The rule this file exists to enforce: you only ever see your own school, and
-- you only see someone's contact details after you have asked to join one of
-- their trips. Both are enforced here, in row-level security, not in the app.
-- Anything enforced only in the client is advisory, because the API is public
-- and anyone can query it directly with the anon key that ships in the bundle.

-- ---------------------------------------------------------------- schools

create table if not exists schools (
  id          text primary key,
  name        text not null,
  short_name  text not null
);

-- Many domains can map to one school (@mail.x.edu and @x.edu are one place).
-- Sign-up resolves a school from this table, so a student never picks their own
-- campus: if the picker were separate from the address, anyone with a Cal Poly
-- email could select another school and message students there.
create table if not exists school_domains (
  domain     text primary key,
  school_id  text not null references schools(id) on delete cascade
);

insert into schools (id, name, short_name) values
  ('calpoly-slo',    'California Polytechnic State University, San Luis Obispo', 'Cal Poly SLO'),
  ('calpoly-pomona', 'California State Polytechnic University, Pomona',          'Cal Poly Pomona'),
  ('ucsb',           'University of California, Santa Barbara',                  'UCSB'),
  ('ucdavis',        'University of California, Davis',                          'UC Davis'),
  ('chico',          'California State University, Chico',                       'Chico State'),
  ('sdsu',           'San Diego State University',                               'SDSU')
on conflict (id) do nothing;

insert into school_domains (domain, school_id) values
  ('calpoly.edu',        'calpoly-slo'),
  ('cpp.edu',            'calpoly-pomona'),
  ('ucsb.edu',           'ucsb'),
  ('ucdavis.edu',        'ucdavis'),
  ('csuchico.edu',       'chico'),
  ('mail.csuchico.edu',  'chico'),
  ('sdsu.edu',           'sdsu')
on conflict (domain) do nothing;

-- ---------------------------------------------------------------- profiles

create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  school_id      text not null references schools(id),
  display_name   text not null default 'Student',
  created_at     timestamptz not null default now()
);

-- Contact lives in its own table purely so row-level security can gate it.
-- If it were a column on profiles, "you can read same-school profiles" would
-- hand every phone number to anyone who signed up.
create table if not exists profile_contacts (
  user_id  uuid primary key references profiles(id) on delete cascade,
  method   text not null default 'instagram' check (method in ('phone', 'instagram', 'snapchat')),
  handle   text not null default ''
);

-- ---------------------------------------------------------------- trips

create table if not exists trips (
  id            uuid primary key default gen_random_uuid(),
  school_id     text not null references schools(id),
  author_id     uuid not null references profiles(id) on delete cascade,
  kind          text not null check (kind in ('offer', 'request')),
  origin        text not null check (length(trim(origin)) > 0),
  destination   text not null check (length(trim(destination)) > 0),
  -- Wall-clock, deliberately without a time zone: a trip leaving at 8am leaves
  -- at 8am, and nobody posting a ride is thinking about UTC.
  depart_start  timestamp not null,
  depart_end    timestamp not null,
  return_start  timestamp,
  return_end    timestamp,
  seats         integer check (seats is null or (seats > 0 and seats <= 8)),
  cost_share    integer check (cost_share is null or (cost_share >= 0 and cost_share <= 500)),
  notes         text not null default '',
  created_at    timestamptz not null default now(),

  constraint depart_window_ordered check (depart_end >= depart_start),
  constraint return_after_depart   check (return_start is null or return_start >= depart_end),
  constraint return_window_ordered check (return_end is null or return_end >= return_start),
  constraint return_leg_complete   check ((return_start is null) = (return_end is null)),
  -- A request is someone without a car; seats would be meaningless.
  constraint requests_have_no_seats check (kind = 'offer' or seats is null)
);

create index if not exists trips_school_depart_idx on trips (school_id, depart_start);

-- Asking to join: an expression of interest, not a booked seat. It is what
-- unlocks the poster's contact, and it is the number worth counting.
create table if not exists trip_joins (
  trip_id     uuid not null references trips(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index if not exists trip_joins_user_idx on trip_joins (user_id);

-- ---------------------------------------------------------------- helpers

-- security definer so it can read profiles while the policies that call it are
-- still being evaluated. Without this, "my school" policies recurse.
create or replace function my_school_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select school_id from profiles where id = auth.uid()
$$;

-- New sign-ups: derive the school from the email domain and refuse anything
-- not on the list. This is the .edu gate, and it is here rather than in the
-- app because the app cannot be trusted with it.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_school text;
  local_part      text;
begin
  select school_id into resolved_school
    from school_domains
   where domain = lower(split_part(new.email, '@', 2));

  if resolved_school is null then
    raise exception 'That email domain is not a supported school.';
  end if;

  local_part := regexp_replace(split_part(new.email, '@', 1), '[._\-0-9]+', ' ', 'g');

  insert into profiles (id, email, school_id, display_name)
  values (
    new.id,
    lower(new.email),
    resolved_school,
    coalesce(nullif(initcap(trim(local_part)), ''), 'Student')
  );

  insert into profile_contacts (user_id) values (new.id);

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- row-level security

alter table schools          enable row level security;
alter table school_domains   enable row level security;
alter table profiles         enable row level security;
alter table profile_contacts enable row level security;
alter table trips            enable row level security;
alter table trip_joins       enable row level security;

-- The school list is public: the sign-in screen needs it before anyone is
-- signed in, to say "that school isn't on Shotgun yet".
drop policy if exists schools_readable on schools;
create policy schools_readable on schools
  for select using (true);

drop policy if exists school_domains_readable on school_domains;
create policy school_domains_readable on school_domains
  for select using (true);

-- Profiles: your own school only. This is what makes the board per-campus.
drop policy if exists profiles_same_school on profiles;
create policy profiles_same_school on profiles
  for select to authenticated
  using (school_id = my_school_id());

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and school_id = my_school_id());

-- Contact details: your own, or someone whose trip you have asked to join.
-- This is the whole point of the separate table.
drop policy if exists contacts_visible_after_join on profile_contacts;
create policy contacts_visible_after_join on profile_contacts
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
        from trip_joins j
        join trips t on t.id = j.trip_id
       where j.user_id = auth.uid()
         and t.author_id = profile_contacts.user_id
    )
  );

drop policy if exists contacts_update_own on profile_contacts;
create policy contacts_update_own on profile_contacts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trips: read your school's, write only your own, and only into your school.
drop policy if exists trips_same_school on trips;
create policy trips_same_school on trips
  for select to authenticated
  using (school_id = my_school_id());

drop policy if exists trips_insert_own on trips;
create policy trips_insert_own on trips
  for insert to authenticated
  with check (author_id = auth.uid() and school_id = my_school_id());

drop policy if exists trips_update_own on trips;
create policy trips_update_own on trips
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and school_id = my_school_id());

drop policy if exists trips_delete_own on trips;
create policy trips_delete_own on trips
  for delete to authenticated
  using (author_id = auth.uid());

-- Joins: yours to see and yours to make. A poster cannot enumerate who looked
-- at their trip, which is deliberate for now; notifying them is a later
-- feature and should be a considered one.
drop policy if exists joins_select_own on trip_joins;
create policy joins_select_own on trip_joins
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists joins_insert_own on trip_joins;
create policy joins_insert_own on trip_joins
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from trips t
       where t.id = trip_id
         and t.school_id = my_school_id()
         and t.author_id <> auth.uid()
    )
  );

drop policy if exists joins_delete_own on trip_joins;
create policy joins_delete_own on trip_joins
  for delete to authenticated
  using (user_id = auth.uid());
