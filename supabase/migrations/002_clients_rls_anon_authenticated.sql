-- Разрешаем доступ к clients для anon и authenticated ролей.
-- Это устраняет 42501 при insert/update, когда запрос идет не под anon.
alter table public.clients enable row level security;

drop policy if exists clients_select_anon on public.clients;
drop policy if exists clients_insert_anon on public.clients;
drop policy if exists clients_update_anon on public.clients;

drop policy if exists clients_select_public on public.clients;
create policy clients_select_public
on public.clients
for select
to anon, authenticated
using (true);

drop policy if exists clients_insert_public on public.clients;
create policy clients_insert_public
on public.clients
for insert
to anon, authenticated
with check (true);

drop policy if exists clients_update_public on public.clients;
create policy clients_update_public
on public.clients
for update
to anon, authenticated
using (true)
with check (true);
