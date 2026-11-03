create table fitto_private.workout_plans (
 id uuid primary key default gen_random_uuid(), link_id uuid not null references fitto_private.links(id),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 draft jsonb not null, published jsonb,
 version integer not null default 1, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), published_at timestamptz
);
create index on fitto_private.workout_plans(link_id);
alter table fitto_private.workout_plans enable row level security;
revoke all on fitto_private.workout_plans from public,anon,authenticated;

create function fitto_private.validate_workout(doc jsonb, publishing boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb;e jsonb;
begin
 if jsonb_typeof(doc) is distinct from 'object' or octet_length(doc::text)>200000 then raise exception 'Ficha inválida.';end if;
 if jsonb_typeof(doc->'title') is distinct from 'string' or char_length(btrim(doc->>'title')) not between 2 and 100 then raise exception 'Informe um nome de ficha entre 2 e 100 caracteres.';end if;
 if jsonb_typeof(doc->'notes') is distinct from 'string' or char_length(doc->>'notes')>1000 then raise exception 'Observações da ficha: máximo de 1000 caracteres.';end if;
 if jsonb_typeof(doc->'sessions') is distinct from 'array' then raise exception 'Divisões inválidas.';end if;
 if jsonb_array_length(doc->'sessions') not between 1 and 12 then raise exception 'Crie de 1 a 12 divisões.';end if;
 for s in select value from jsonb_array_elements(doc->'sessions') loop
  if jsonb_typeof(s->'name') is distinct from 'string' or char_length(btrim(s->>'name')) not between 1 and 80 then raise exception 'Informe o nome de cada divisão.';end if;
  if jsonb_typeof(s->'exercises') is distinct from 'array' then raise exception 'Exercícios inválidos.';end if;
  if jsonb_array_length(s->'exercises')>40 or (publishing and jsonb_array_length(s->'exercises')=0) then raise exception 'Cada divisão publicada precisa de 1 a 40 exercícios.';end if;
  for e in select value from jsonb_array_elements(s->'exercises') loop
   if jsonb_typeof(e->'name') is distinct from 'string' or char_length(btrim(e->>'name')) not between 1 and 120 then raise exception 'Informe o nome de cada exercício.';end if;
   if jsonb_typeof(e->'sets') is distinct from 'number' or (e->>'sets') !~ '^[0-9]+$' then raise exception 'Informe séries inteiras de 1 a 20.';end if;
   if (e->>'sets')::numeric not between 1 and 20 then raise exception 'Informe séries de 1 a 20.';end if;
   if jsonb_typeof(e->'reps') is distinct from 'string' or char_length(btrim(e->>'reps')) not between 1 and 40 then raise exception 'Informe as repetições de cada exercício.';end if;
   if jsonb_typeof(e->'rest_seconds') is distinct from 'number' or (e->>'rest_seconds') !~ '^[0-9]+$' then raise exception 'Informe o descanso em segundos inteiros.';end if;
   if (e->>'rest_seconds')::numeric not between 0 and 1800 then raise exception 'Descanso: de 0 a 1800 segundos.';end if;
   if jsonb_typeof(e->'notes') is distinct from 'string' or char_length(e->>'notes')>500 then raise exception 'Observações do exercício: máximo de 500 caracteres.';end if;
  end loop;
 end loop;
end $$;
revoke all on function fitto_private.validate_workout(jsonb,boolean) from public,anon,authenticated;

create function fitto_private.workout_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles;l fitto_private.links;w fitto_private.workout_plans;result jsonb;doc jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.';end if;
 select * into p from public.profiles where id=profile_id and user_id=auth.uid();
 if p.id is null then raise exception 'Perfil não autorizado.';end if;
 -- Lock the relationship for writes so termination cannot race a prescription.
 if action='list' then select * into l from fitto_private.links where id=link_id;
 else select * into l from fitto_private.links where id=link_id for update;end if;
 if l.id is null or l.status<>'active' then raise exception 'O acompanhamento não está ativo.';end if;
 if not ((p.role='student' and l.student_id=p.id) or (p.role='professional' and l.professional_id=p.id and 'Treinador'=any(p.specialties))) then raise exception 'Acesso aos treinos não autorizado.';end if;
 if action='list' then
  if p.role='student' then
   select coalesce(jsonb_agg(jsonb_build_object('id',id,'content',published,'published_at',published_at) order by published_at desc),'[]') into result from fitto_private.workout_plans where workout_plans.link_id=l.id and status='published';
  else select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc),'[]') into result from fitto_private.workout_plans t where t.link_id=l.id;end if;
  return result;
 end if;
 if p.role<>'professional' then raise exception 'Somente o treinador pode alterar os treinos.';end if;
 if action not in ('save','publish','archive') then raise exception 'Operação inválida.';end if;
 if payload->>'id' is not null then
  select * into w from fitto_private.workout_plans where id=(payload->>'id')::uuid and workout_plans.link_id=l.id for update;
  if w.id is null then raise exception 'Ficha não encontrada.';end if;
  if (payload->>'version')::integer is distinct from w.version then raise exception 'A ficha foi alterada em outra sessão. Atualize antes de editar.';end if;
  if w.status='archived' then raise exception 'Esta ficha está arquivada. Crie uma nova ficha.';end if;
 elsif action<>'save' then raise exception 'Salve a ficha antes de continuar.';end if;
 if action='save' then
  doc:=payload->'content';perform fitto_private.validate_workout(doc,false);
  if w.id is null then insert into fitto_private.workout_plans(link_id,draft) values(l.id,doc) returning * into w;
  else update fitto_private.workout_plans set draft=doc,version=version+1,updated_at=now() where id=w.id returning * into w;end if;
 elsif action='publish' then
  perform fitto_private.validate_workout(w.draft,true);
  update fitto_private.workout_plans set published=draft,status='published',published_at=now(),updated_at=now(),version=version+1 where id=w.id returning * into w;
 else update fitto_private.workout_plans set status='archived',updated_at=now(),version=version+1 where id=w.id returning * into w;
 end if;
 return to_jsonb(w);
end $$;
revoke all on function fitto_private.workout_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function fitto_private.workout_api(text,uuid,uuid,jsonb) to authenticated;
create function public.workout_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select fitto_private.workout_api(action,profile_id,link_id,payload)$$;
revoke all on function public.workout_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.workout_api(text,uuid,uuid,jsonb) to authenticated;
