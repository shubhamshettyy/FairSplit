-- Split sessions table with user ownership
create table if not exists public.split_sessions (
  session_id text primary key,
  user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists idx_split_sessions_created_at
  on public.split_sessions (created_at desc);

create index if not exists idx_split_sessions_user_id
  on public.split_sessions (user_id);

-- If upgrading from an existing table, run:
-- alter table public.split_sessions add column if not exists user_id text;
-- create index if not exists idx_split_sessions_user_id on public.split_sessions (user_id);
