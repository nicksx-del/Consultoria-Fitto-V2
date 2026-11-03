create or replace function fitto_private.validate_workout(doc jsonb,publishing boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb;e jsonb;p jsonb;a jsonb;alternative_doc jsonb;
begin
 perform fitto_private.validate_workout_before_planning(doc,publishing);
 if doc ? 'phases' then
  if jsonb_typeof(doc->'phases') is distinct from 'array' or jsonb_array_length(doc->'phases')>12 then raise exception 'Fases inválidas.';end if;
  if jsonb_array_length(doc->'phases')>0 and coalesce(doc->>'starts','')='' then raise exception 'Defina o início do ciclo.';end if;
  for p in select value from jsonb_array_elements(doc->'phases') loop
   if jsonb_typeof(p->'name') is distinct from 'string' or char_length(btrim(p->>'name')) not between 1 and 80 or jsonb_typeof(p->'weeks') is distinct from 'number' or (p->>'weeks') !~ '^[0-9]+$' or (p->>'weeks')::int not between 1 and 26 or coalesce(p->>'kind','') not in ('build','deload') or jsonb_typeof(p->'notes') is distinct from 'string' or char_length(p->>'notes')>500 then raise exception 'Revise nome, duração e orientações das fases.';end if;
  end loop;
 end if;
 for s in select value from jsonb_array_elements(doc->'sessions') loop
  if s ? 'times_per_week' and (jsonb_typeof(s->'times_per_week') is distinct from 'number' or (s->>'times_per_week') !~ '^[1-7]$') then raise exception 'Frequência deve ser de 1 a 7 por semana.';end if;
  for e in select value from jsonb_array_elements(s->'exercises') loop
   if e ? 'weekly_targets' then
    if jsonb_typeof(e->'weekly_targets') is distinct from 'array' or jsonb_array_length(e->'weekly_targets')>26 then raise exception 'Use até 26 metas semanais.';end if;
    for p in select value from jsonb_array_elements(e->'weekly_targets') loop
     if jsonb_typeof(p->'week') is distinct from 'number' or (p->>'week') !~ '^[0-9]+$' or (p->>'week')::int not between 1 and 52 or jsonb_typeof(p->'load') is distinct from 'string' or char_length(p->>'load')>100 or jsonb_typeof(p->'reps') is distinct from 'string' or char_length(btrim(p->>'reps')) not between 1 and 40 then raise exception 'Meta semanal inválida.';end if;
    end loop;
    if (select count(*)<>count(distinct value->>'week') from jsonb_array_elements(e->'weekly_targets')) then raise exception 'Semanas repetidas.';end if;
   end if;
   if e ? 'progression' then
    p:=e->'progression';
    if coalesce(p->>'mode','') not in ('load','reps') or jsonb_typeof(p->'increment') is distinct from 'number' or (p->>'increment')::numeric<=0 or (p->>'increment')::numeric>100 or jsonb_typeof(p->'target_reps') is distinct from 'number' or (p->>'target_reps') !~ '^[0-9]+$' or (p->>'target_reps')::int not between 1 and 1000 then raise exception 'Regra de progressão inválida.';end if;
    if p->>'mode'='reps' and (p->>'increment')::numeric<>trunc((p->>'increment')::numeric) then raise exception 'Incremento de repetições deve ser inteiro.';end if;
   end if;
   if e ? 'approved_alternatives' then
    if jsonb_typeof(e->'approved_alternatives') is distinct from 'array' or jsonb_array_length(e->'approved_alternatives')>5 then raise exception 'Use até 5 alternativas aprovadas.';end if;
    for a in select value from jsonb_array_elements(e->'approved_alternatives') loop
     if jsonb_typeof(a->'name') is distinct from 'string' or char_length(btrim(a->>'name')) not between 1 and 120 then raise exception 'Alternativa inválida.';end if;
     -- Catalog references use the same validation as an ordinary exercise.
     alternative_doc:=jsonb_build_object('title','Alternativa','notes','','sessions',jsonb_build_array(jsonb_build_object('name','A','exercises',jsonb_build_array((e-'approved_alternatives'-'progression'-'group_rule'-'group'-'method') || a))));
     perform fitto_private.validate_workout_before_planning(alternative_doc,false);
    end loop;
    if (select count(*)<>count(distinct lower(btrim(value->>'name'))) from jsonb_array_elements(e->'approved_alternatives')) then raise exception 'Alternativas repetidas.';end if;
   end if;
  end loop;
 end loop;
end $$;
revoke all on function fitto_private.validate_workout(jsonb,boolean) from public,anon,authenticated;

create or replace function fitto_private.training_tools_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles;l fitto_private.links;x fitto_private.executions;f fitto_private.exercise_feedback;b fitto_private.training_blocks;doc jsonb;e jsonb;idx integer;alt text;
begin
 select * into p from public.profiles where id=profile_id and user_id=auth.uid();
 select * into l from fitto_private.links where id=link_id for update;
 if p.id is null or l.id is null or l.status<>'active' or not ((p.role='student' and l.student_id=p.id) or (p.role='professional' and l.professional_id=p.id and 'Treinador'=any(p.specialties))) then raise exception 'Acompanhamento não autorizado.';end if;
 if action='read' then
  return jsonb_build_object('blocks',case when p.role='professional' then coalesce((select jsonb_agg(to_jsonb(t) order by t.updated_at desc) from fitto_private.training_blocks t where professional_id=p.id),'[]') else '[]'::jsonb end,
   'feedback',coalesce((select jsonb_agg(t.doc order by t.updated_at desc) from (select to_jsonb(v)||jsonb_build_object('exercise_name',ex.snapshot->'session'->'exercises'->v.exercise_index->>'name') as doc,v.updated_at from fitto_private.exercise_feedback v join fitto_private.executions ex on ex.id=v.execution_id where ex.link_id=l.id and (payload->>'execution_id' is null or ex.id=(payload->>'execution_id')::uuid) order by v.updated_at desc limit 500) t),'[]'));
 elsif action in ('block_save','block_delete') then
  if p.role<>'professional' then raise exception 'Somente o treinador pode salvar modelos.';end if;
  if action='block_delete' then delete from fitto_private.training_blocks where id=(payload->>'id')::uuid and professional_id=p.id;return '{}';end if;
  doc:=payload->'content';perform fitto_private.validate_workout(doc,true);
  if jsonb_array_length(doc->'sessions')<>1 then raise exception 'Salve um único bloco por modelo.';end if;
  if (select count(*) from fitto_private.training_blocks where professional_id=p.id)>=100 then raise exception 'Limite de 100 modelos de blocos.';end if;
  insert into fitto_private.training_blocks(professional_id,name,content) values(p.id,doc->>'title',doc) returning * into b;return to_jsonb(b);
 elsif action in ('feedback_save','feedback_review') then
  select * into x from fitto_private.executions where id=(payload->>'execution_id')::uuid and executions.link_id=l.id for update;
  if x.id is null then raise exception 'Execução não encontrada.';end if;
  if jsonb_typeof(payload->'exercise_index') is distinct from 'number' or (payload->>'exercise_index') !~ '^[0-9]+$' then raise exception 'Exercício inválido.';end if;
  idx:=(payload->>'exercise_index')::int;
  if idx<0 or idx>=jsonb_array_length(x.snapshot->'session'->'exercises') then raise exception 'Exercício inválido.';end if;
  if action='feedback_review' then
   if p.role<>'professional' then raise exception 'Somente o treinador pode revisar.';end if;
   update fitto_private.exercise_feedback set reviewed=true where execution_id=x.id and exercise_index=idx returning * into f;return to_jsonb(f);
  end if;
  if p.role<>'student' or x.status not in ('active','completed') then raise exception 'Somente o aluno pode registrar feedback.';end if;
  if jsonb_typeof(payload->'message') is distinct from 'string' or char_length(payload->>'message')>500 or jsonb_typeof(payload->'discomfort') is distinct from 'boolean' or jsonb_typeof(payload->'alternative') is distinct from 'string' then raise exception 'Feedback inválido.';end if;
  if payload->'difficulty'<>'null'::jsonb and (jsonb_typeof(payload->'difficulty') is distinct from 'number' or (payload->>'difficulty') !~ '^([1-9]|10)$') then raise exception 'Dificuldade deve ser de 1 a 10.';end if;
  e:=x.snapshot->'session'->'exercises'->idx;alt:=payload->>'alternative';
  if alt<>'' and not exists(select 1 from jsonb_array_elements(coalesce(e->'approved_alternatives','[]')) a where a->>'name'=alt) then raise exception 'Alternativa não autorizada pelo treinador.';end if;
  select * into f from fitto_private.exercise_feedback where execution_id=x.id and exercise_index=idx;
  if alt is distinct from coalesce(f.alternative,'') and (x.status<>'active' or exists(select 1 from jsonb_array_elements(x.progress->idx) v where coalesce((v->>'done')::boolean,false) or v->>'weight' is not null or v->>'reps' is not null or v->>'seconds' is not null or v->>'hold_until' is not null or exists(select 1 from jsonb_array_elements(coalesce(v->'steps','[]')) st where coalesce((st->>'done')::boolean,false) or st->>'weight' is not null or st->>'reps' is not null or st->>'seconds' is not null or st->>'hold_until' is not null))) then raise exception 'Escolha a alternativa antes de registrar as séries.';end if;
  insert into fitto_private.exercise_feedback(execution_id,exercise_index,difficulty,discomfort,message,alternative) values(x.id,idx,(payload->>'difficulty')::int,(payload->>'discomfort')::boolean,payload->>'message',alt)
  on conflict on constraint exercise_feedback_pkey do update set difficulty=excluded.difficulty,discomfort=excluded.discomfort,message=excluded.message,alternative=excluded.alternative,reviewed=false,updated_at=now() returning * into f;
  return to_jsonb(f);
 end if;
 raise exception 'Operação inválida.';
end $$;
revoke all on function fitto_private.training_tools_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function fitto_private.training_tools_api(text,uuid,uuid,jsonb) to authenticated;
create or replace function public.training_tools_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select fitto_private.training_tools_api(action,profile_id,link_id,payload)$$;
revoke all on function public.training_tools_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.training_tools_api(text,uuid,uuid,jsonb) to authenticated;
