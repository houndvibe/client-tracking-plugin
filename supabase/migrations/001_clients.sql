-- Таблица для трекинга клиентов.
create table if not exists public.clients (
  id bigserial primary key,
  nickname text not null unique,
  deal_count integer not null default 0 check (deal_count >= 0),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_nickname on public.clients (nickname);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

-- Пример базовых политик для браузерного доступа через anon/publishable key.
-- При необходимости ограничьте доступ дополнительными условиями.
drop policy if exists clients_select_anon on public.clients;
create policy clients_select_anon
on public.clients
for select
to anon
using (true);

drop policy if exists clients_insert_anon on public.clients;
create policy clients_insert_anon
on public.clients
for insert
to anon
with check (true);

drop policy if exists clients_update_anon on public.clients;
create policy clients_update_anon
on public.clients
for update
to anon
using (true)
with check (true);
