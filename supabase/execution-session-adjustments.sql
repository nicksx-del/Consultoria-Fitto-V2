alter table fitto_private.executions add column original_snapshot jsonb, add column adjustments jsonb not null default '[]';
create function fitto_private.execution_adjust(profile_id uuid,link_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; rel fitto_private.links; r fitto_private.executions;
 ex jsonb; member jsonb; members jsonb; prescriptions jsonb; logs jsonb; next_prescriptions jsonb; next_logs jsonb;
 snap jsonb; prog jsonb; recipe jsonb; old_recipe jsonb; event jsonb; item jsonb;
 ei int; si int; n int; j int; count_sets int; new_count int; op text; group_id text;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.';end if;
 select * into actor from public.profiles where id=profile_id and user_id=auth.uid();
 select * into rel from fitto_private.links where id=link_id for update;
 if actor.id is null or actor.role<>'student' or rel.id is null or rel.status<>'active' or rel.student_id<>actor.id then raise exception 'Ajuste não autorizado.';end if;
 select * into r from fitto_private.executions e where e.id=(payload->>'id')::uuid and e.link_id=rel.id for update;
 if r.id is null or r.status<>'active' then raise exception 'Sessão indisponível.';end if;
 if (payload->>'version')::int is distinct from r.version then raise exception 'A sessão mudou. Reabra antes de ajustar.';end if;
 if jsonb_array_length(r.adjustments)>=100 then raise exception 'Limite de 100 ajustes nesta sessão.';end if;
 ei:=(payload->>'exercise_index')::int;si:=(payload->>'set_index')::int;op:=payload->>'operation';
 if ei is null or ei<0 or ei>=jsonb_array_length(r.snapshot->'session'->'exercises') or si is null or op is null or op not in ('add','remove','replace') then raise exception 'Ajuste inválido.';end if;
 ex:=r.snapshot->'session'->'exercises'->ei;
 count_sets:=(ex->>'sets')::int;
 if si<0 or si>count_sets or (op<>'add' and si=count_sets) then raise exception 'Série indisponível.';end if;
 new_count:=count_sets+case when op='add' then 1 when op='remove' then -1 else 0 end;
 if new_count not between 1 and 20 then raise exception 'Mantenha de 1 a 20 séries ou voltas.';end if;
 recipe:=payload->'prescription';
 if op<>'remove' and (jsonb_typeof(recipe) is distinct from 'object' or octet_length(recipe::text)>10000) then raise exception 'Confira a série.';end if;
 group_id:=ex->'group_rule'->>'id';snap:=r.snapshot;prog:=r.progress;
 for n in 0..jsonb_array_length(snap->'session'->'exercises')-1 loop
  member:=snap->'session'->'exercises'->n;
  if n<>ei and not coalesce((op in ('add','remove') and group_id is not null and member->'group_rule'->>'id'=group_id),false) then continue;end if;
  logs:=prog->n;prescriptions:='[]';next_prescriptions:='[]';next_logs:='[]';
  for j in 0..(member->>'sets')::int-1 loop
   item:=coalesce(member->'prescribed_sets'->j,jsonb_build_object('target',member->>'reps','load',coalesce(member->>'load',''),'rest',member->>'rest_seconds','kind','work'));
   prescriptions:=prescriptions||jsonb_build_array(item);
  end loop;
  if op<>'add' then
   item:=logs->si;
   if coalesce((item->>'done')::boolean,false) or item->>'weight' is not null or item->>'reps' is not null or item->>'seconds' is not null or item->>'actual_effort' is not null or item->>'rep_quality' is not null or exists(select 1 from jsonb_array_elements(coalesce(item->'steps','[]')) step where coalesce((step->>'done')::boolean,false) or step->>'weight' is not null or step->>'reps' is not null or step->>'seconds' is not null or step->>'hold_until' is not null) then raise exception 'Séries registradas não podem ser removidas ou reinterpretadas.';end if;
  end if;
  for j in 0..count_sets loop
   if op='add' and j=si then
    item:=case when n=ei then recipe else coalesce(prescriptions->least(si,count_sets-1),prescriptions->0) end;
    next_prescriptions:=next_prescriptions||jsonb_build_array(item);
    next_logs:=next_logs||jsonb_build_array(jsonb_build_object('weight',null,'reps',null,'done',false));
   end if;
   if j=count_sets then exit;end if;
   if j=si and op='remove' then continue;end if;
   next_prescriptions:=next_prescriptions||jsonb_build_array(case when j=si and op='replace' then recipe else prescriptions->j end);
   next_logs:=next_logs||jsonb_build_array(logs->j);
  end loop;
  member:=jsonb_set(jsonb_set(member,'{sets}',to_jsonb(new_count)),'{prescribed_sets}',next_prescriptions);
  if group_id is not null and op in ('add','remove') then member:=jsonb_set(member,'{group_rule,rounds}',to_jsonb(new_count));end if;
  snap:=jsonb_set(snap,array['session','exercises',n::text],member);prog:=jsonb_set(prog,array[n::text],next_logs);
 end loop;
 perform fitto_private.validate_workout(jsonb_build_object('title',snap->>'title','notes','','sessions',jsonb_build_array(snap->'session')),true);
 event:=jsonb_build_object('operation',op,'exercise',ex->>'name','exercise_index',ei,'set_index',si,'group',group_id is not null,'at',now(),'prescription',case when op='remove' then null else recipe end);
 update fitto_private.executions set original_snapshot=coalesce(original_snapshot,snapshot),snapshot=snap,progress=prog,
 adjustments=adjustments||jsonb_build_array(event),rest_until=null,version=version+1 where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function fitto_private.execution_adjust(uuid,uuid,jsonb) from public,anon;
grant execute on function fitto_private.execution_adjust(uuid,uuid,jsonb) to authenticated;
create function public.execution_adjust(profile_id uuid,link_id uuid,payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select fitto_private.execution_adjust(profile_id,link_id,payload) $$;
revoke all on function public.execution_adjust(uuid,uuid,jsonb) from public,anon;
grant execute on function public.execution_adjust(uuid,uuid,jsonb) to authenticated;
