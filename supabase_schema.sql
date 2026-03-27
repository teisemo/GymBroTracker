-- ══════════════════════════════════════════════════════════
--  GymTracker — Schema Supabase
--  Esegui questo SQL nel SQL Editor di Supabase
--  (supabase.com → tuo progetto → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════

-- ── 1. TABELLA PROFILI ─────────────────────────────────────
-- Estende auth.users con display_name e email visibili
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  updated_at    timestamptz default now()
);

-- Abilita Row Level Security
alter table public.profiles enable row level security;

-- Ogni utente vede tutti i profili (serve per i filtri)
create policy "Profili leggibili da tutti gli utenti autenticati"
  on public.profiles for select
  to authenticated
  using (true);

-- Ogni utente può scrivere solo il proprio profilo
create policy "Utente modifica solo il proprio profilo"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Utente aggiorna solo il proprio profilo"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Trigger per creare il profilo automaticamente al signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 2. TABELLA SESSIONI ALLENAMENTO ────────────────────────
create table if not exists public.workout_sessions (
  id               bigserial primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  allenamento_idx  smallint not null,   -- 0, 1, 2
  session_idx      smallint not null,   -- 0-4 (le 5 sessioni)
  session_date     date,
  series_data      jsonb default '{}'::jsonb,
  updated_at       timestamptz default now(),

  -- Una sola riga per (utente, allenamento, sessione)
  unique (user_id, allenamento_idx, session_idx)
);

-- Indici utili
create index if not exists idx_ws_user    on public.workout_sessions (user_id);
create index if not exists idx_ws_all_idx on public.workout_sessions (allenamento_idx);
create index if not exists idx_ws_date    on public.workout_sessions (session_date);

-- Row Level Security
alter table public.workout_sessions enable row level security;

-- Ogni utente autenticato può leggere TUTTE le sessioni
-- (serve per storico condiviso e statistiche del gruppo)
create policy "Sessioni leggibili da tutti gli autenticati"
  on public.workout_sessions for select
  to authenticated
  using (true);

-- Ogni utente può inserire/aggiornare/cancellare solo le proprie
create policy "Inserimento solo proprie sessioni"
  on public.workout_sessions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Aggiornamento solo proprie sessioni"
  on public.workout_sessions for update
  to authenticated
  using (user_id = auth.uid());

create policy "Cancellazione solo proprie sessioni"
  on public.workout_sessions for delete
  to authenticated
  using (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════
--  FATTO! Ora torna su js/config.js e inserisci
--  SUPABASE_URL e SUPABASE_ANON_KEY dal pannello API.
-- ══════════════════════════════════════════════════════════
