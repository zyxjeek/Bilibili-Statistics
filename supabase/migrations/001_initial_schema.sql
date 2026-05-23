create extension if not exists pgcrypto;

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  business text,
  kid text,
  title text not null,
  bvid text,
  author_mid bigint,
  author_name text,
  tag_name text,
  duration integer,
  progress integer,
  view_at timestamptz not null,
  cover text,
  uri text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_history_unique_event unique (business, kid, view_at)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  last_cursor jsonb,
  error_message text
);

create index if not exists watch_history_view_at_idx on public.watch_history (view_at desc);
create index if not exists watch_history_author_mid_idx on public.watch_history (author_mid);
create index if not exists watch_history_tag_name_idx on public.watch_history (tag_name);
create index if not exists watch_history_business_idx on public.watch_history (business);
create index if not exists sync_runs_started_at_idx on public.sync_runs (started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watch_history_set_updated_at on public.watch_history;
create trigger watch_history_set_updated_at
before update on public.watch_history
for each row execute function public.set_updated_at();

create or replace view public.daily_stats as
select
  date_trunc('day', view_at)::date as watched_date,
  count(*) filter (where duration is not null and duration > 0) as video_count,
  coalesce(sum(duration) filter (where duration is not null and duration > 0), 0)::bigint as watched_seconds,
  count(distinct author_mid) filter (where author_mid is not null) as creator_count
from public.watch_history
group by 1
order by 1 desc;

alter table public.watch_history enable row level security;
alter table public.sync_runs enable row level security;

drop policy if exists "Allow anon read watch history" on public.watch_history;
create policy "Allow anon read watch history"
on public.watch_history for select
to anon
using (true);

drop policy if exists "Allow anon read sync runs" on public.sync_runs;
create policy "Allow anon read sync runs"
on public.sync_runs for select
to anon
using (true);
