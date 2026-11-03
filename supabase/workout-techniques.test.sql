begin;
do $$
declare tu uuid:=gen_random_uuid();su uuid:=gen_random_uuid();tp uuid:=gen_random_uuid();sp uuid:=gen_random_uuid();l uuid:=gen_random_uuid();doc jsonb;w jsonb;r jsonb;bad jsonb;denied bool;
begin
 insert into auth.users(id) values(tu),(su);
 insert into public.profiles(id,user_id,role,display_name,username,specialties) values(tp,tu,'professional','Trainer Test','t_'||substr(replace(tp::text,'-',''),1,12),array['Treinador']),(sp,su,'student','Student Test','t_'||substr(replace(sp::text,'-',''),1,12),'{}');
 insert into fitto_private.links(id,professional_id,student_id,status) values(l,tp,sp,'active');
 doc:='{"title":"Techniques","notes":"","sessions":[{"name":"A","exercises":[{"name":"Press","sets":1,"reps":"10","rest_seconds":60,"notes":"","method":"Supersérie","group":"g","group_rule":{"id":"g","type":"superset","rounds":1,"rest_seconds":60},"prescribed_sets":[{"kind":"top","target":"10","load":"20kg","rest":"60","notes":"Controlar movimento","technique":{"type":"rest_pause","steps":[{"target":"10","load":"20kg","rest":"20"},{"target":"4","load":"20kg","rest":"0"}]}}]},{"name":"Row","sets":1,"reps":"10","rest_seconds":60,"notes":"","method":"Supersérie","group":"g","group_rule":{"id":"g","type":"superset","rounds":1,"rest_seconds":60},"prescribed_sets":[{"kind":"backoff","target":"10","load":"15kg","rest":"60","technique":{"type":"drop_set","steps":[{"target":"10","load":"20kg","rest":"0"},{"target":"8","load":"","rest":"0","reduction":"20"}]}}]}]}]}';
 perform set_config('request.jwt.claim.sub',tu::text,true);
 w:=public.workout_api('save',tp,l,jsonb_build_object('content',doc));w:=public.workout_api('publish',tp,l,jsonb_build_object('id',w->>'id','version',w->'version'));
 bad:=jsonb_set(doc,'{sessions,0,exercises,1,group_rule,rounds}','2');denied:=false;begin perform public.workout_api('save',tp,l,jsonb_build_object('content',bad));exception when others then denied:=true;end;if not denied then raise exception 'Invalid group accepted';end if;
 bad:=jsonb_set(doc,'{sessions,0,exercises,1,prescribed_sets,0,technique,steps,1,reduction}','""');denied:=false;begin perform public.workout_api('save',tp,l,jsonb_build_object('content',bad));exception when others then denied:=true;end;if not denied then raise exception 'Drop without reduction accepted';end if;
 bad:=jsonb_set(doc,'{sessions,0,exercises,0,prescribed_sets,0,technique}','{"type":"isometric","steps":[{"target":"20","load":"","rest":"0","seconds":"20"}]}');perform fitto_private.validate_workout(bad,true);
 bad:=jsonb_set(bad,'{sessions,0,exercises,0,prescribed_sets,0,technique,steps,0,seconds}','"0"');denied:=false;begin perform fitto_private.validate_workout(bad,true);exception when others then denied:=true;end;if not denied then raise exception 'Invalid hold accepted';end if;
 perform set_config('request.jwt.claim.sub',su::text,true);r:=public.execution_api('start',sp,l,jsonb_build_object('plan',w->>'id','division',0));
 if r->'snapshot'->'session'->'exercises'->0->'group_rule'->>'type' is distinct from 'superset' then raise exception 'Group snapshot lost';end if;
 bad:=jsonb_set(r,'{progress,0,0}','{"weight":20,"reps":14,"done":true}');denied:=false;begin perform public.execution_api('save',sp,l,bad);exception when others then denied:=true;end;if not denied then raise exception 'Technique completed without steps';end if;
 r:=jsonb_set(r,'{progress,0,0}','{"weight":20,"reps":10,"done":false,"actual_effort":{"mode":"rir","min":1,"max":1},"steps":[{"weight":20,"reps":10,"done":true},{"weight":20,"reps":null,"done":false}]}');r:=public.execution_api('save',sp,l,r);
 bad:=jsonb_set(r,'{progress,0,0,done}','true');denied:=false;begin perform public.execution_api('save',sp,l,bad);exception when others then denied:=true;end;if not denied then raise exception 'Incomplete technique completed';end if;
 bad:=jsonb_set(r,'{progress,0,0,steps,0,done}','false');bad:=jsonb_set(bad,'{progress,0,0,steps,1,done}','true');denied:=false;begin perform public.execution_api('save',sp,l,bad);exception when others then denied:=true;end;if not denied then raise exception 'Out-of-order stages accepted';end if;
 bad:=jsonb_set(r,'{progress,0,0,actual_effort,max}','2');denied:=false;begin perform public.execution_api('save',sp,l,bad);exception when others then denied:=true;end;if not denied then raise exception 'Range accepted as actual effort';end if;
 r:=jsonb_set(r,'{progress,0,0,steps,1}','{"weight":20,"reps":4,"done":true}');r:=jsonb_set(r,'{progress,0,0,done}','true');r:=jsonb_set(r,'{progress,0,0,reps}','14');r:=public.execution_api('save',sp,l,r);r:=public.execution_api('finish',sp,l,r);
 if r->'progress'->0->0->'actual_effort'->>'min' is distinct from '1' then raise exception 'Actual effort lost';end if;
 if has_function_privilege('anon','fitto_private.validate_set_log(jsonb,jsonb,integer)','execute') then raise exception 'Validator exposed';end if;
end $$;
rollback;
select 'PASS: grouped prescriptions, kind/technique validation, drops, holds, guided step order/completion, actual effort, immutable snapshot and privileges' as result;
