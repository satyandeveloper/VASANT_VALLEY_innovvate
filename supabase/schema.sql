-- I AGREE — run once in the Supabase SQL editor.
-- Safe to re-run: everything is IF NOT EXISTS / OR REPLACE-style.

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  fingerprint text unique not null,
  title text not null default 'Untitled document',
  source_type text not null default 'paste',
  source_url text,
  doc_text text not null,
  doc_chars int not null,
  verdict text not null,
  headline text not null,
  summary_bullets jsonb not null default '[]',
  flags jsonb not null default '[]',
  unverified jsonb not null default '[]',
  is_sample boolean not null default false,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists analyses_created_at_idx on analyses (created_at desc);

create table if not exists user_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  analysis_id uuid not null references analyses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, analysis_id)
);

create index if not exists user_history_user_idx on user_history (user_id, created_at desc);

-- One row per live AI call. Two questions are asked of it: how many calls this
-- subject has made in the last 30 days (the allowance), and how many this IP
-- has made in the last 10 minutes (the abuse floor). One insert answers both,
-- so there is no second table.
create table if not exists request_log (
  ip_hash text not null,
  created_at timestamptz not null default now()
);

-- Added after the table shipped: existing deployments have the table without
-- this column, and `add column if not exists` is what carries them forward.
-- 'anon:<visitor-cookie-uuid>' or 'user:<clerk-user-id>'. Nullable because
-- rows written before the quota existed have no subject to name.
alter table request_log add column if not exists subject text;

create index if not exists request_log_idx on request_log (ip_hash, created_at);
create index if not exists request_log_subject_idx on request_log (subject, created_at desc);

alter table analyses enable row level security;
alter table user_history enable row level security;
alter table request_log enable row level security;

-- All access goes through server routes. When the server uses the secret
-- (service-role) key, RLS is bypassed. These policies additionally allow the
-- publishable/anon key to be used server-side as a fallback.
drop policy if exists "analyses_read" on analyses;
create policy "analyses_read" on analyses for select using (true);
drop policy if exists "analyses_write" on analyses;
create policy "analyses_write" on analyses for insert with check (true);
drop policy if exists "analyses_update" on analyses;
create policy "analyses_update" on analyses for update using (true) with check (true);

drop policy if exists "history_read" on user_history;
create policy "history_read" on user_history for select using (true);
drop policy if exists "history_write" on user_history;
create policy "history_write" on user_history for insert with check (true);

drop policy if exists "ratelimit_read" on request_log;
create policy "ratelimit_read" on request_log for select using (true);
drop policy if exists "ratelimit_write" on request_log;
create policy "ratelimit_write" on request_log for insert with check (true);
