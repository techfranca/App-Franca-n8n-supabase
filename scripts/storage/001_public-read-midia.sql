-- Torna o bucket "midia" público para leitura e cria policies de SELECT
-- Execute isso no SQL editor do Supabase do seu projeto.

-- (Opcional) Marcar bucket como público
update storage.buckets set public = true where name = 'midia';

-- Habilitar RLS (já vem habilitado por padrão, mantém por clareza)
alter table storage.objects enable row level security;

-- Permitir leitura pública (SELECT) de objetos do bucket "midia"
create policy if not exists "Public read for bucket midia"
on storage.objects
for select
to public
using (bucket_id = 'midia');

-- Opcionalmente, permitir inserção/atualização para usuários autenticados (se necessário)
-- create policy if not exists "Authenticated write for bucket midia"
-- on storage.objects
-- for insert
-- to authenticated
-- with check (bucket_id = 'midia');
--
-- create policy if not exists "Authenticated update for bucket midia"
-- on storage.objects
-- for update
-- to authenticated
-- using (bucket_id = 'midia');
