begin;
do $$
declare tu uuid:=gen_random_uuid();su uuid:=gen_random_uuid();ou uuid:=gen_random_uuid();nu uuid:=gen_random_uuid();tp uuid:=gen_random_uuid();sp uuid:=gen_random_uuid();op uuid:=gen_random_uuid();np uuid:=gen_random_uuid();l uuid:=gen_random_uuid();nl uuid:=gen_random_uuid();w jsonb;r jsonb;v int;denied boolean;doc jsonb:='{"title":"Ficha teste","notes":"Orientações de teste","sessions":[{"name":"Treino A","exercises":[]}]}';
begin
 insert into auth.users(id) values(tu),(su),(ou),(nu);
 insert into public.profiles(id,user_id,role,display_name,username,specialties) values
 (tp,tu,'professional','Test Trainer','t_'||substr(replace(tp::text,'-',''),1,12),array['Treinador']),
 (sp,su,'student','Test Student','t_'||substr(replace(sp::text,'-',''),1,12),'{}'),
 (op,ou,'professional','Other Trainer','t_'||substr(replace(op::text,'-',''),1,12),array['Treinador']),
 (np,nu,'professional','Nutrition','t_'||substr(replace(np::text,'-',''),1,12),array['Nutricionista']);
 insert into fitto_private.links(id,professional_id,student_id,status) values(l,tp,sp,'active'),(nl,np,sp,'active');
 perform set_config('request.jwt.claim.sub',tu::text,true);
 w:=public.workout_api('save',tp,l,jsonb_build_object('content',doc));
 denied:=false;begin perform public.workout_api('publish',tp,l,jsonb_build_object('id',w->>'id','version',w->'version'));exception when others then denied:=true;end;
 if not denied then raise exception 'Published empty session';end if;
 doc:=jsonb_set(doc,'{sessions,0,exercises}','[{"name":"Exercício teste","sets":3,"reps":"10 a 12","rest_seconds":60,"notes":"Execução de teste"}]');
 w:=public.workout_api('save',tp,l,jsonb_build_object('id',w->>'id','version',w->'version','content',doc));
 perform set_config('request.jwt.claim.sub',su::text,true);
 if public.workout_api('list',sp,l)<>'[]'::jsonb then raise exception 'Draft leaked';end if;
 denied:=false;begin perform public.workout_api('save',sp,l,jsonb_build_object('content',doc));exception when others then denied:=true;end;
 if not denied then raise exception 'Student modified prescription';end if;
 perform set_config('request.jwt.claim.sub',tu::text,true);
 w:=public.workout_api('publish',tp,l,jsonb_build_object('id',w->>'id','version',w->'version'));
 perform set_config('request.jwt.claim.sub',su::text,true);
 r:=public.workout_api('list',sp,l);
 if r->0->'content'->>'title'<>'Ficha teste' or r->0 ? 'draft' then raise exception 'Published read/privacy failed';end if;
 perform set_config('request.jwt.claim.sub',ou::text,true);
 denied:=false;begin perform public.workout_api('list',op,l);exception when others then denied:=true;end;
 if not denied then raise exception 'Other trainer read allowed';end if;
 perform set_config('request.jwt.claim.sub',nu::text,true);
 denied:=false;begin perform public.workout_api('save',np,nl,jsonb_build_object('content',doc));exception when others then denied:=true;end;
 if not denied then raise exception 'Nutrition prescribed workouts';end if;
 perform set_config('request.jwt.claim.sub',tu::text,true);
 v:=(w->>'version')::int;doc:=jsonb_set(doc,'{title}','"Nova versão"');
 w:=public.workout_api('save',tp,l,jsonb_build_object('id',w->>'id','version',v,'content',doc));
 denied:=false;begin perform public.workout_api('save',tp,l,jsonb_build_object('id',w->>'id','version',v,'content',doc));exception when others then denied:=true;end;
 if not denied then raise exception 'Stale write allowed';end if;
 perform set_config('request.jwt.claim.sub',su::text,true);
 r:=public.workout_api('list',sp,l);if r->0->'content'->>'title'<>'Ficha teste' then raise exception 'Unpublished change leaked';end if;
 perform set_config('request.jwt.claim.sub',tu::text,true);
 w:=public.workout_api('publish',tp,l,jsonb_build_object('id',w->>'id','version',w->'version'));
 perform set_config('request.jwt.claim.sub',su::text,true);
 r:=public.workout_api('list',sp,l);if r->0->'content'->>'title'<>'Nova versão' then raise exception 'Republish failed';end if;
 perform set_config('request.jwt.claim.sub',tu::text,true);
 w:=public.workout_api('archive',tp,l,jsonb_build_object('id',w->>'id','version',w->'version'));
 perform set_config('request.jwt.claim.sub',su::text,true);
 if public.workout_api('list',sp,l)<>'[]'::jsonb then raise exception 'Archived plan visible';end if;
 perform set_config('request.jwt.claim.sub',tu::text,true);
 doc:=jsonb_set(doc,'{sessions,0,exercises,0,sets}','0');denied:=false;
 begin perform public.workout_api('save',tp,l,jsonb_build_object('content',doc));exception when others then denied:=true;end;
 if not denied then raise exception 'Invalid sets accepted';end if;
 update fitto_private.links set status='ended' where id=l;
 denied:=false;begin perform public.workout_api('list',tp,l);exception when others then denied:=true;end;
 if not denied then raise exception 'Ended relationship allowed';end if;
 if has_table_privilege('authenticated','fitto_private.workout_plans','select') or has_function_privilege('anon','public.workout_api(text,uuid,uuid,jsonb)','execute') then raise exception 'Workouts exposed';end if;
end $$;
rollback;
select 'PASS: draft/save/publish, published snapshot, student read-only, trainer ownership, specialty restrictions, stale edits, republish, archive, validation, ended links, privileges' as result;
