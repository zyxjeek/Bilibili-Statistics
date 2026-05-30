create table if not exists public.app_secrets (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_secrets is
  'Service-only application secrets such as Bilibili login cookies and refresh tokens.';

alter table public.app_secrets enable row level security;

drop trigger if exists app_secrets_set_updated_at on public.app_secrets;
create trigger app_secrets_set_updated_at
before update on public.app_secrets
for each row execute function public.set_updated_at();
