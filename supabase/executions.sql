create table fitto_private.executions (
 id uuid primary key default gen_random_uuid(), link_id uuid not null references fitto_private.links(id),
 snapshot jsonb not null, progress jsonb not null default '[]', notes text not null default '',
 difficulty integer check(difficulty between 1 and 10), rest_until timestamptz,
 status text not null default 'active' check(status in ('active','completed','cancelled')),
 version integer not null default 1, started_at timestamptz not null default now(), finished_at timestamptz
);
create unique index executions_one_active on fitto_private.executions(link_id) where status='active';
alter table fitto_private.executions enable row level security;
revoke all on fitto_private.executions from public,anon,authenticated;
create function fitto_private.execution_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
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
 if item->>'reps' is not null and (jsonb_typeof(item->'reps')<>'number' or (item->>'reps') !~ '^[0-9]+$' or (item->>'reps')::numeric not between 0 and 1000) then raise exception 'Repetições inválidas.';end if;
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
revoke all on function fitto_private.execution_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function fitto_private.execution_api(text,uuid,uuid,jsonb) to authenticated;
create function public.execution_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select fitto_private.execution_api(action,profile_id,link_id,payload) $$;
revoke all on function public.execution_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.execution_api(text,uuid,uuid,jsonb) to authenticated;
