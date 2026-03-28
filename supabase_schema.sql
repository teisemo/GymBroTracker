-- ══════════════════════════════════════════════════════════
--  GymBroTracker — Schema completo per nuove installazioni
--  Esegui TUTTO in un'unica query nel SQL Editor di Supabase
-- ══════════════════════════════════════════════════════════

-- ── 1. PROFILES ───────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  updated_at    timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant all on public.profiles to authenticated;
grant usage on schema public to authenticated, anon;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. ATHLETES ───────────────────────────────────────────
create table if not exists public.athletes (
  id         serial primary key,
  nome       text not null,
  cognome    text not null default '',
  position   smallint not null default 0,
  active     boolean not null default true,
  created_at timestamptz default now()
);
alter table public.athletes enable row level security;
create policy "athletes_select" on public.athletes for select to authenticated using (true);
create policy "athletes_insert" on public.athletes for insert to authenticated with check (true);
create policy "athletes_update" on public.athletes for update to authenticated using (true) with check (true);
create policy "athletes_delete" on public.athletes for delete to authenticated using (true);
grant select, insert, update, delete on public.athletes to authenticated;
grant usage, select on sequence public.athletes_id_seq to authenticated;

-- ── 3. WORKOUTS (tabelle di allenamento dinamiche) ────────
create table if not exists public.workouts (
  id         serial primary key,
  nome       text not null,
  short      text not null default '',
  position   smallint not null default 0,
  active     boolean not null default true,
  created_at timestamptz default now()
);
alter table public.workouts enable row level security;
create policy "workouts_select" on public.workouts for select to authenticated using (true);
create policy "workouts_insert" on public.workouts for insert to authenticated with check (true);
create policy "workouts_update" on public.workouts for update to authenticated using (true) with check (true);
create policy "workouts_delete" on public.workouts for delete to authenticated using (true);
grant select, insert, update, delete on public.workouts to authenticated;
grant usage, select on sequence public.workouts_id_seq to authenticated;

-- Workout default (modificabili dalla webapp)
insert into public.workouts (nome, short, position) values
  ('Allenamento 1', 'A1', 0),
  ('Allenamento 2', 'A2', 1),
  ('Allenamento 3', 'A3', 2);

-- ── 4. EXERCISES ──────────────────────────────────────────
create table if not exists public.exercises (
  id          serial primary key,
  workout_id  integer not null references public.workouts(id) on delete cascade,
  position    smallint not null default 0,
  nome        text not null,
  tempo       text not null default '3111',
  range_rip   text not null default '6-10',
  updated_at  timestamptz default now()
);
alter table public.exercises enable row level security;
create policy "exercises_select" on public.exercises for select to authenticated using (true);
create policy "exercises_insert" on public.exercises for insert to authenticated with check (true);
create policy "exercises_update" on public.exercises for update to authenticated using (true) with check (true);
create policy "exercises_delete" on public.exercises for delete to authenticated using (true);
grant select, insert, update, delete on public.exercises to authenticated;
grant usage, select on sequence public.exercises_id_seq to authenticated;
create index if not exists idx_ex_workout on public.exercises (workout_id, position);

-- Esercizi default (collegati ai workout appena creati)
insert into public.exercises (workout_id, position, nome, tempo, range_rip)
select w.id, e.position, e.nome, e.tempo, e.range_rip
from public.workouts w
join (values
  (0, 0, 'LEG EXTENSIONS',           '3111', '6-10'),
  (0, 1, 'LEG CURL',                 '3111', '6-10'),
  (0, 2, 'PANCA PIANA',              '3111', '6-10'),
  (0, 3, 'LAT MACHINE',              '2111', '6-10'),
  (0, 4, 'HAMMER CURL',              '3111', '6-10'),
  (1, 0, 'STACCO DA TERRA',          '3111', '6-10'),
  (1, 1, 'TRAZIONI ALLA SBARRA',     '3111', '6-10'),
  (1, 2, 'PARALLELE',                '3111', '6-10'),
  (1, 3, 'SPINTE PER LE SPALLE',     '3111', '6-10'),
  (1, 4, 'CURL AL CAVO',             '3111', '6-10'),
  (2, 0, 'SQUAT',                    '2111', '6-10'),
  (2, 1, 'REMATORE',                 '3111', '6-10'),
  (2, 2, 'CROCI SU PANCA INCLINATA', '3111', '6-10'),
  (2, 3, 'ALZATE LATERALI',          '2111', '6-10'),
  (2, 4, 'SPINTE IN BASSO BARRA',    '3111', '6-10')
) as e(wpos, position, nome, tempo, range_rip) on w.position = e.wpos;

-- ── 5. WORKOUT_SESSIONS ───────────────────────────────────
create table if not exists public.workout_sessions (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  athlete_id  integer references public.athletes(id) on delete set null,
  workout_id  integer references public.workouts(id) on delete set null,
  session_date date,
  series_data  jsonb default '{}'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (user_id, athlete_id, session_date, workout_id)
);
alter table public.workout_sessions enable row level security;
create policy "ws_select" on public.workout_sessions for select to authenticated using (true);
create policy "ws_insert" on public.workout_sessions for insert to authenticated with check (user_id = auth.uid());
create policy "ws_update" on public.workout_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ws_delete" on public.workout_sessions for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant usage, select on sequence public.workout_sessions_id_seq to authenticated;
create index if not exists idx_ws_user    on public.workout_sessions (user_id);
create index if not exists idx_ws_athlete on public.workout_sessions (athlete_id);
create index if not exists idx_ws_workout on public.workout_sessions (workout_id);
create index if not exists idx_ws_date    on public.workout_sessions (session_date desc);

-- ── VERIFICA ──────────────────────────────────────────────
select t.table_name, count(c.column_name) as colonne
from information_schema.tables t
join information_schema.columns c on t.table_name=c.table_name and t.table_schema=c.table_schema
where t.table_schema='public'
  and t.table_name in ('profiles','athletes','workouts','exercises','workout_sessions')
group by t.table_name order by t.table_name;
