create function fitto_private.validate_workout_methods(doc jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb;e jsonb;p jsonb;t jsonb;b jsonb;g jsonb;cnt int;j int;
begin
 for s in select value from jsonb_array_elements(doc->'sessions') loop
 for e in select value from jsonb_array_elements(s->'exercises') loop
 if e ? 'group_rule' then
 g:=e->'group_rule';
 if jsonb_typeof(g) is distinct from 'object' or coalesce(g->>'type','') not in ('superset','biset','circuit') or char_length(coalesce(g->>'id','')) not between 1 and 100 or coalesce(g->>'rounds','') !~ '^[0-9]{1,2}$' or coalesce(g->>'rest_seconds','') !~ '^[0-9]{1,4}$' then raise exception 'Agrupamento inválido.';end if;
 if (g->>'rounds')::int not between 1 and 20 or (g->>'rest_seconds')::int>1800 or (e->>'sets')::int<>(g->>'rounds')::int then raise exception 'Confira as voltas e o descanso do grupo.';end if;
 select count(*) into cnt from jsonb_array_elements(s->'exercises') x where x->'group_rule'->>'id'=g->>'id';
 if cnt<2 or (g->>'type'='biset' and cnt<>2) or exists(select 1 from jsonb_array_elements(s->'exercises') x where x->'group_rule'->>'id'=g->>'id' and (x->'group_rule'<>g or (x->>'sets')::int<>(g->>'rounds')::int)) then raise exception 'Grupo incompleto ou inconsistente.';end if;
 end if;
 if e ? 'prescribed_sets' then
 if jsonb_typeof(e->'prescribed_sets') is distinct from 'array' then raise exception 'Séries inválidas.';end if;
 for p in select value from jsonb_array_elements(e->'prescribed_sets') loop
 if p ? 'notes' and (jsonb_typeof(p->'notes') is distinct from 'string' or char_length(p->>'notes')>500) then raise exception 'Orientação da série: máximo 500 caracteres.';end if;
 if p ? 'technique' then
 t:=p->'technique';
 if jsonb_typeof(t) is distinct from 'object' or coalesce(t->>'type','') not in ('rest_pause','drop_set','cluster','isometric') or jsonb_typeof(t->'steps') is distinct from 'array' then raise exception 'Técnica inválida.';end if;
 cnt:=jsonb_array_length(t->'steps');
 if cnt>8 or cnt<(case when t->>'type'='isometric' then 1 else 2 end) then raise exception 'Confira a quantidade de etapas.';end if;
 j:=0;for b in select value from jsonb_array_elements(t->'steps') loop
 if jsonb_typeof(b->'target') is distinct from 'string' or char_length(btrim(b->>'target')) not between 1 and 40 or jsonb_typeof(b->'load') is distinct from 'string' or char_length(b->>'load')>100 or coalesce(b->>'rest','') !~ '^[0-9]{1,4}$' then raise exception 'Preencha alvo, carga orientada e pausa das etapas.';end if;
 if (b->>'rest')::int>1800 then raise exception 'Pausa máxima de 1800s.';end if;
 if t->>'type'='isometric' then
 if coalesce(b->>'seconds','') !~ '^[0-9]{1,4}$' then raise exception 'Informe o tempo de sustentação.';end if;
 if (b->>'seconds')::int not between 1 and 1800 then raise exception 'Sustentação: de 1 a 1800s.';end if;end if;
 if coalesce(b->>'reduction','')<>'' and (b->>'reduction') !~ '^[0-9]{1,2}$' then raise exception 'Redução percentual: de 0 a 99.';end if;
 if t->>'type'='drop_set' and j>0 and coalesce(b->>'reduction','')='' and btrim(b->>'load')='' then raise exception 'Prescreva a carga ou a redução de cada drop.';end if;
 j:=j+1;end loop;end if;end loop;end if;
 end loop;end loop;
end $$;
revoke all on function fitto_private.validate_workout_methods(jsonb) from public,anon,authenticated;
create or replace function fitto_private.validate_workout(doc jsonb,publishing boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb;e jsonb;v jsonb;k text;
begin
 perform fitto_private.validate_workout_base(doc,publishing); perform fitto_private.validate_workout_methods(doc);
 foreach k in array array['goal','starts','review'] loop
 if doc ? k and (jsonb_typeof(doc->k)<>'string' or char_length(doc->>k)>500) then raise exception 'Metadados da ficha inválidos.';end if;end loop;
 if coalesce(doc->>'starts','')<>'' then perform (doc->>'starts')::date;end if;
 if coalesce(doc->>'review','')<>'' then perform (doc->>'review')::date;end if;
 if coalesce(doc->>'starts','')<>'' and coalesce(doc->>'review','')<>'' and (doc->>'review')::date<(doc->>'starts')::date then raise exception 'Revisão anterior ao início.';end if;
 for s in select value from jsonb_array_elements(doc->'sessions') loop
 if s ? 'days' and (jsonb_typeof(s->'days')<>'string' or char_length(s->>'days')>100) then raise exception 'Dias inválidos.';end if;
 for e in select value from jsonb_array_elements(s->'exercises') loop
 perform fitto_private.validate_effort(e->'effort_target');
 foreach k in array array['muscle','load','effort','cadence','alternatives','method','group','video'] loop
 if e ? k and (jsonb_typeof(e->k)<>'string' or char_length(e->>k)>500) then raise exception 'Prescrição avançada inválida.';end if;end loop;
 if e ? 'metric' and coalesce(e->>'metric','') not in ('reps','seconds','meters') then raise exception 'Unidade inválida.';end if;
 if coalesce(e->>'video','')<>'' and (e->>'video') !~ '^https://[^[:space:]]+$' then raise exception 'Vídeo precisa de HTTPS.';end if;
 if e ? 'prescribed_sets' then
 if jsonb_typeof(e->'prescribed_sets')<>'array' then raise exception 'Séries individuais inválidas.';end if;
 if jsonb_array_length(e->'prescribed_sets')<>(e->>'sets')::int then raise exception 'Séries individuais diferentes do total.';end if;
 for v in select value from jsonb_array_elements(e->'prescribed_sets') loop
 perform fitto_private.validate_effort(v->'effort_target');
 if jsonb_typeof(v->'target') is distinct from 'string' or char_length(btrim(v->>'target')) not between 1 and 40 or jsonb_typeof(v->'load') is distinct from 'string' or char_length(v->>'load')>100 or coalesce(v->>'kind','') not in ('warmup','ramp','work','top','backoff') or coalesce(v->>'rest','') !~ '^[0-9]{1,4}$' then raise exception 'Preencha a prescrição de cada série.';end if;
 if (v->>'rest')::int>1800 then raise exception 'Descanso máximo de 1800s.';end if;
 end loop;end if;
 if publishing and coalesce(e->>'method','') in ('Supersérie','Bi-set') then
 if coalesce(btrim(e->>'group'),'')='' or (select count(*) from jsonb_array_elements(s->'exercises') x where x->>'group'=e->>'group' and x->>'method'=e->>'method')<2 then raise exception 'Agrupe pelo menos dois exercícios combinados.';end if;end if;
 end loop;end loop;
end $$;


create function fitto_private.validate_set_log(doc jsonb,p jsonb,max_reps int) returns void language plpgsql security invoker set search_path='' as $$
declare s jsonb;expected int;pending boolean:=false;
begin
 if doc ? 'actual_effort' then
 perform fitto_private.validate_effort(doc->'actual_effort');
 if doc->>'actual_effort' is not null and (doc->'actual_effort'->>'min')::numeric<>(doc->'actual_effort'->>'max')::numeric then raise exception 'Registre um único valor de esforço realizado.';end if;end if;
 if doc->>'seconds' is not null and (jsonb_typeof(doc->'seconds')<>'number' or (doc->>'seconds') !~ '^[0-9]+$' or (doc->>'seconds')::numeric not between 0 and 14400) then raise exception 'Duração inválida.';end if;
 if p ? 'technique' then
 expected:=jsonb_array_length(p->'technique'->'steps');
 if doc ? 'steps' then
 if jsonb_typeof(doc->'steps') is distinct from 'array' then raise exception 'Etapas inválidas.';end if;
 if jsonb_array_length(doc->'steps')<>expected then raise exception 'Etapas diferentes da prescrição.';end if;
 for s in select value from jsonb_array_elements(doc->'steps') loop
 if jsonb_typeof(s->'done') is distinct from 'boolean' then raise exception 'Estado da etapa inválido.';end if;
 if s->>'weight' is not null and (jsonb_typeof(s->'weight')<>'number' or (s->>'weight')::numeric not between 0 and 2000) then raise exception 'Carga da etapa inválida.';end if;
 if s->>'reps' is not null and (jsonb_typeof(s->'reps')<>'number' or (s->>'reps') !~ '^[0-9]+$' or (s->>'reps')::numeric not between 0 and max_reps) then raise exception 'Resultado da etapa inválido.';end if;
 if s->>'seconds' is not null and (jsonb_typeof(s->'seconds')<>'number' or (s->>'seconds') !~ '^[0-9]+$' or (s->>'seconds')::numeric not between 0 and 1800) then raise exception 'Tempo da etapa inválido.';end if;
 if (s->>'hold_until')::timestamptz>now()+interval '30 minutes' then raise exception 'Cronômetro inválido.';end if;
 if (s->>'done')::boolean then if pending then raise exception 'Conclua as etapas na ordem prescrita.';end if;else pending:=true;end if;
 end loop;
 if (doc->>'done')::boolean and pending then raise exception 'Conclua todas as etapas antes de concluir a série.';end if;
 elsif (doc->>'done')::boolean then raise exception 'Registre as etapas desta técnica.';end if;
 elsif doc ? 'steps' then raise exception 'Esta série não possui etapas prescritas.';end if;
end $$;
revoke all on function fitto_private.validate_set_log(jsonb,jsonb,int) from public,anon,authenticated;
create or replace function fitto_private.execution_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; l fitto_private.links; r fitto_private.executions; w fitto_private.workout_plans;
 doc jsonb; ex jsonb; item jsonb; rowdata jsonb; i integer; j integer; done_count integer:=0;k integer; result jsonb;
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
 k:=0;for item in select value from jsonb_array_elements(rowdata) loop
 if jsonb_typeof(item->'done') is distinct from 'boolean' then raise exception 'Série inválida.';end if;
 if item->>'weight' is not null and (jsonb_typeof(item->'weight')<>'number' or (item->>'weight')::numeric not between 0 and 2000) then raise exception 'Carga inválida.';end if;
 if item->>'reps' is not null and (jsonb_typeof(item->'reps')<>'number' or (item->>'reps') !~ '^[0-9]+$' or (item->>'reps')::numeric not between 0 and (case when coalesce(ex->>'metric','reps')='reps' then 1000 else 1000000 end)) then raise exception 'Repetições inválidas.';end if;
 perform fitto_private.validate_set_log(item,ex->'prescribed_sets'->k,case when coalesce(ex->>'metric','reps')='reps' then 1000 else 1000000 end);k:=k+1;
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
