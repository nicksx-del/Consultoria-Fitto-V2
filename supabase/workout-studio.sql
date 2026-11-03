create table fitto_private.workout_templates (
 id uuid primary key default gen_random_uuid(), professional_id uuid not null references public.profiles(id),
 name text not null check(char_length(name) between 2 and 100), content jsonb not null, updated_at timestamptz not null default now()
);
create index on fitto_private.workout_templates(professional_id);
create table fitto_private.workout_recovery (
 link_id uuid primary key references fitto_private.links(id), content jsonb not null,
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create table fitto_private.workout_versions (
 id uuid primary key default gen_random_uuid(), plan_id uuid not null references fitto_private.workout_plans(id),
 link_id uuid not null references fitto_private.links(id), content jsonb not null, version integer not null, published_at timestamptz not null default now()
);
create index on fitto_private.workout_versions(link_id,published_at desc);
alter table fitto_private.workout_templates enable row level security;
alter table fitto_private.workout_recovery enable row level security;
alter table fitto_private.workout_versions enable row level security;
revoke all on fitto_private.workout_templates,fitto_private.workout_recovery,fitto_private.workout_versions from public,anon,authenticated;
insert into fitto_private.workout_versions(plan_id,link_id,content,version,published_at)
 select id,link_id,published,version,published_at from fitto_private.workout_plans where published is not null;

alter function fitto_private.validate_workout(jsonb,boolean) rename to validate_workout_base;
create function fitto_private.validate_workout(doc jsonb,publishing boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb;e jsonb;v jsonb;k text;
begin
 perform fitto_private.validate_workout_base(doc,publishing);
 foreach k in array array['goal','starts','review'] loop
 if doc ? k and (jsonb_typeof(doc->k)<>'string' or char_length(doc->>k)>500) then raise exception 'Metadados da ficha inválidos.';end if;end loop;
 if coalesce(doc->>'starts','')<>'' then perform (doc->>'starts')::date;end if;
 if coalesce(doc->>'review','')<>'' then perform (doc->>'review')::date;end if;
 if coalesce(doc->>'starts','')<>'' and coalesce(doc->>'review','')<>'' and (doc->>'review')::date<(doc->>'starts')::date then raise exception 'Revisão anterior ao início.';end if;
 for s in select value from jsonb_array_elements(doc->'sessions') loop
 if s ? 'days' and (jsonb_typeof(s->'days')<>'string' or char_length(s->>'days')>100) then raise exception 'Dias inválidos.';end if;
 for e in select value from jsonb_array_elements(s->'exercises') loop
 foreach k in array array['muscle','load','effort','cadence','alternatives','method','group','video'] loop
 if e ? k and (jsonb_typeof(e->k)<>'string' or char_length(e->>k)>500) then raise exception 'Prescrição avançada inválida.';end if;end loop;
 if e ? 'metric' and coalesce(e->>'metric','') not in ('reps','seconds','meters') then raise exception 'Unidade inválida.';end if;
 if coalesce(e->>'video','')<>'' and (e->>'video') !~ '^https://[^[:space:]]+$' then raise exception 'Vídeo precisa de HTTPS.';end if;
 if e ? 'prescribed_sets' then
 if jsonb_typeof(e->'prescribed_sets')<>'array' then raise exception 'Séries individuais inválidas.';end if;
 if jsonb_array_length(e->'prescribed_sets')<>(e->>'sets')::int then raise exception 'Séries individuais diferentes do total.';end if;
 for v in select value from jsonb_array_elements(e->'prescribed_sets') loop
 if jsonb_typeof(v->'target') is distinct from 'string' or char_length(btrim(v->>'target')) not between 1 and 40 or jsonb_typeof(v->'load') is distinct from 'string' or char_length(v->>'load')>100 or coalesce(v->>'kind','') not in ('warmup','work') or coalesce(v->>'rest','') !~ '^[0-9]{1,4}$' then raise exception 'Preencha a prescrição de cada série.';end if;
 if (v->>'rest')::int>1800 then raise exception 'Descanso máximo de 1800s.';end if;
 end loop;end if;
 if publishing and coalesce(e->>'method','') in ('Supersérie','Bi-set') then
 if coalesce(btrim(e->>'group'),'')='' or (select count(*) from jsonb_array_elements(s->'exercises') x where x->>'group'=e->>'group' and x->>'method'=e->>'method')<2 then raise exception 'Agrupe pelo menos dois exercícios combinados.';end if;end if;
 end loop;end loop;
end $$;
revoke all on function fitto_private.validate_workout(jsonb,boolean) from public,anon,authenticated;

create function fitto_private.workout_studio_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles;l fitto_private.links;r jsonb;rec fitto_private.workout_recovery;t fitto_private.workout_templates;doc jsonb;
begin
 select * into p from public.profiles where id=profile_id and user_id=auth.uid() and role='professional' and 'Treinador'=any(specialties);
 select * into l from fitto_private.links where id=link_id for update;
 if p.id is null or l.id is null or l.professional_id<>p.id or l.status<>'active' then raise exception 'Acompanhamento não autorizado.';end if;
 if action='read' then
 return jsonb_build_object('recovery',(select to_jsonb(x) from fitto_private.workout_recovery x where x.link_id=l.id),
 'templates',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from fitto_private.workout_templates x where professional_id=p.id),'[]'),
 'versions',coalesce((select jsonb_agg(to_jsonb(x) order by x.published_at desc) from (select * from fitto_private.workout_versions where workout_versions.link_id=l.id order by published_at desc limit 50) x),'[]'),
 'students',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',s.display_name)) from fitto_private.links x join public.profiles s on s.id=x.student_id where x.professional_id=p.id and x.status='active'),'[]'));
 elsif action in ('recover','clear') then
 select * into rec from fitto_private.workout_recovery x where x.link_id=l.id for update;
 if coalesce(rec.revision,0) is distinct from (payload->>'revision')::int then raise exception 'Rascunho alterado em outra aba. Reabra o editor para recuperar a versão salva.';end if;
 if action='clear' then delete from fitto_private.workout_recovery x where x.link_id=l.id;return '{}';end if;
 doc:=payload->'content';
 if jsonb_typeof(doc) is distinct from 'object' or octet_length(doc::text)>250000 then raise exception 'Rascunho inválido ou muito grande.';end if;
 insert into fitto_private.workout_recovery(link_id,content) values(l.id,doc) on conflict on constraint workout_recovery_pkey do update set content=excluded.content,revision=workout_recovery.revision+1,updated_at=now() returning * into rec;
 return to_jsonb(rec);
 elsif action='template_save' then
 doc:=payload->'content';perform fitto_private.validate_workout(doc,true);
 if (select count(*) from fitto_private.workout_templates where professional_id=p.id)>=100 then raise exception 'Limite de 100 modelos. Remova um modelo antes de criar outro.';end if;
 insert into fitto_private.workout_templates(professional_id,name,content) values(p.id,doc->>'title',doc) returning * into t;return to_jsonb(t);
 elsif action='template_delete' then
 delete from fitto_private.workout_templates where id=(payload->>'id')::uuid and professional_id=p.id;return '{}';
 elsif action='copy' then
 doc:=payload->'content';perform fitto_private.validate_workout(doc,false);
 if not exists(select 1 from fitto_private.links x where x.id=(payload->>'target')::uuid and x.professional_id=p.id and x.status='active') then raise exception 'Aluno de destino não autorizado.';end if;
 -- Destination ownership is checked again by the existing API.
 return fitto_private.workout_api('save',p.id,(payload->>'target')::uuid,jsonb_build_object('content',doc));
 end if;
 raise exception 'Operação inválida.';
end $$;
revoke all on function fitto_private.workout_studio_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function fitto_private.workout_studio_api(text,uuid,uuid,jsonb) to authenticated;
create function public.workout_studio_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select fitto_private.workout_studio_api(action,profile_id,link_id,payload)$$;
revoke all on function public.workout_studio_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.workout_studio_api(text,uuid,uuid,jsonb) to authenticated;
create or replace function fitto_private.workout_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
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
  update fitto_private.workout_plans set status='archived',version=version+1,updated_at=now() where workout_plans.link_id=l.id and id<>w.id and status='published';
  update fitto_private.workout_plans set published=draft,status='published',published_at=now(),updated_at=now(),version=version+1 where id=w.id returning * into w;
  insert into fitto_private.workout_versions(plan_id,link_id,content,version,published_at) values(w.id,l.id,w.published,w.version,w.published_at);
 else update fitto_private.workout_plans set status='archived',updated_at=now(),version=version+1 where id=w.id returning * into w;
 end if;
 return to_jsonb(w);
end $$;

create or replace function fitto_private.execution_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; l fitto_private.links; r fitto_private.executions; w fitto_private.workout_plans;
 doc jsonb; ex jsonb; item jsonb; rowdata jsonb; i integer; j integer; done_count integer:=0; result jsonb;
begin
 select * into p from public.profiles where id=profile_id and user_id=auth.uid();
 select * into l from fitto_private.links where id=link_id for update;
 if p.id is null or l.id is null or l.status<>'active' then raise exception 'Acompanhamento não autorizado.'; end if;
 if not ((p.role='student' and p.id=l.student_id) or (p.role='professional' and p.id=l.professional_id and 'Treinador'=any(p.specialties))) then raise exception 'Acesso não autorizado.';end if;
 if action='list' then
 select coalesce(jsonb_agg(to_jsonb(t) order by t.started_at desc),'[]') into result from (select * from fitto_private.executions e where e.link_id=l.id order by started_at desc limit 50) t;
 return result;end if;
 if p.role<>'student' then raise exception 'Somente o aluno pode registrar a execução.';end if;
 if action='start' then
 select * into r from fitto_private.executions e where e.link_id=l.id and status='active';
 if r.id is not null then return to_jsonb(r);end if;
 select * into w from fitto_private.workout_plans where id=(payload->>'plan')::uuid and workout_plans.link_id=l.id and status='published';
 doc:=w.published->'sessions'->((payload->>'division')::integer);
 if w.id is null or doc is null then raise exception 'Treino indisponível.';end if;
 insert into fitto_private.executions(link_id,snapshot) values(l.id,jsonb_build_object('title',w.published->'title','session',doc,'plan',w.id,'version',w.version)) returning * into r;
 doc:='[]';for ex in select value from jsonb_array_elements(r.snapshot->'session'->'exercises') loop
 rowdata:='[]';for j in 1..(ex->>'sets')::integer loop rowdata:=rowdata||jsonb_build_array(jsonb_build_object('weight',null,'reps',null,'done',false));end loop;
 doc:=doc||jsonb_build_array(rowdata);end loop;
 update fitto_private.executions set progress=doc where id=r.id returning * into r;return to_jsonb(r);
 end if;
 select * into r from fitto_private.executions e where e.id=(payload->>'id')::uuid and e.link_id=l.id for update;
 if r.id is null or r.status<>'active' then raise exception 'Execução encerrada ou indisponível. Atualize a página.';end if;
 if (payload->>'version')::integer is distinct from r.version then raise exception 'Execução alterada em outra aba. Atualize a página antes de continuar.';end if;
 if action='cancel' then update fitto_private.executions set status='cancelled',finished_at=now(),version=version+1 where id=r.id returning * into r;return to_jsonb(r);end if;
 if action not in ('save','finish') then raise exception 'Operação inválida.';end if;
 doc:=payload->'progress';
 if jsonb_typeof(doc) is distinct from 'array' or octet_length(doc::text)>200000 then raise exception 'Séries inválidas.';end if;
 if jsonb_array_length(doc)<>jsonb_array_length(r.snapshot->'session'->'exercises') then raise exception 'Exercícios inválidos.';end if;
 for i in 0..jsonb_array_length(doc)-1 loop
 ex:=r.snapshot->'session'->'exercises'->i;rowdata:=doc->i;
 if jsonb_typeof(rowdata) is distinct from 'array' then raise exception 'Séries inválidas.';end if;
 if jsonb_array_length(rowdata)<>(ex->>'sets')::integer then raise exception 'Quantidade de séries inválida.';end if;
 for item in select value from jsonb_array_elements(rowdata) loop
 if jsonb_typeof(item->'done') is distinct from 'boolean' then raise exception 'Série inválida.';end if;
 if item->>'weight' is not null and (jsonb_typeof(item->'weight')<>'number' or (item->>'weight')::numeric not between 0 and 2000) then raise exception 'Carga inválida.';end if;
 if item->>'reps' is not null and (jsonb_typeof(item->'reps')<>'number' or (item->>'reps') !~ '^[0-9]+$' or (item->>'reps')::numeric not between 0 and (case when coalesce(ex->>'metric','reps')='reps' then 1000 else 1000000 end)) then raise exception 'Repetições inválidas.';end if;
 if (item->>'done')::boolean then done_count:=done_count+1;end if;
 end loop;end loop;
 if char_length(coalesce(payload->>'notes',''))>1000 then raise exception 'Observações: máximo 1000 caracteres.';end if;
 if action='finish' and done_count=0 then raise exception 'Conclua pelo menos uma série.';end if;
 if (payload->>'rest_until')::timestamptz>now()+interval '30 minutes' then raise exception 'Descanso inválido.';end if;
 update fitto_private.executions set progress=doc,notes=coalesce(payload->>'notes',''),difficulty=(payload->>'difficulty')::integer,
 rest_until=(payload->>'rest_until')::timestamptz,version=version+1,
 status=case when action='finish' then 'completed' else 'active' end,
 finished_at=case when action='finish' then now() else null end where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
