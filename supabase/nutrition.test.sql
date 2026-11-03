begin;
do $$
declare u uuid:=gen_random_uuid(); other_u uuid:=gen_random_uuid(); trainer_u uuid:=gen_random_uuid();
 p uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); other_p uuid:=gen_random_uuid(); trainer_p uuid:=gen_random_uuid(); l uuid:=gen_random_uuid(); trainer_l uuid:=gen_random_uuid();
 w jsonb; published jsonb; response jsonb; entry jsonb; denied boolean;
 doc jsonb:='{"title":"Plano de teste","goal":"Organização","notes":"Orientação teste","restrictions":"Preferências teste","targets":{"kcal":"","protein":"","carbs":"","fat":""},"meals":[{"id":"breakfast","name":"Café da manhã","time":"08:00","notes":"Orientação da refeição","foods":[{"id":"food","name":"Alimento de teste","quantity":"1 unidade","substitution":"Alternativa autorizada de teste"}]}]}';
begin
 insert into auth.users(id) values(u),(other_u),(trainer_u);
 insert into public.profiles(id,user_id,role,display_name,username,specialties) values
 (p,u,'professional','Nutrition Test','n_'||substr(replace(p::text,'-',''),1,12),array['Nutricionista']),
 (s,u,'student','Student Test','n_'||substr(replace(s::text,'-',''),1,12),'{}'),
 (other_p,other_u,'professional','Other Nutrition','n_'||substr(replace(other_p::text,'-',''),1,12),array['Nutricionista']),
 (trainer_p,trainer_u,'professional','Trainer Test','n_'||substr(replace(trainer_p::text,'-',''),1,12),array['Treinador']);
 insert into fitto_private.links(id,professional_id,student_id,status) values(l,p,s,'active'),(trainer_l,trainer_p,s,'active');
 perform set_config('request.jwt.claim.sub',u::text,true);
 w:=public.nutrition_api('save',p,l,jsonb_build_object('version',0,'content',doc));
 response:=public.nutrition_api('read',s,l);
 if response->'plan' ? 'draft' or response->'plan'->'published'<>'null'::jsonb then raise exception 'Draft leaked to student';end if;
 denied:=false;begin perform public.nutrition_api('save',s,l,jsonb_build_object('version',w->'version','content',doc));exception when others then denied:=true;end;if not denied then raise exception 'Student changed plan';end if;
 denied:=false;begin perform public.nutrition_api('save',p,l,jsonb_build_object('version',0,'content',doc));exception when others then denied:=true;end;if not denied then raise exception 'Stale save accepted';end if;
 published:=public.nutrition_api('publish',p,l,jsonb_build_object('version',w->'version'));
 entry:=public.nutrition_api('log',s,l,jsonb_build_object('plan_version',published->'published_version','meal_id','breakfast','day',current_date::text,'status','done','note','Realizada conforme o plano','entry_version',0));
 if entry->>'status'<>'done' or entry->'meal_snapshot'->>'name'<>'Café da manhã' then raise exception 'Meal save failed';end if;
 denied:=false;begin perform public.nutrition_api('log',p,l,jsonb_build_object('plan_version',published->'published_version','meal_id','breakfast','day',current_date::text,'status','done','note','','entry_version',0));exception when others then denied:=true;end;if not denied then raise exception 'Professional wrote student log';end if;
 denied:=false;begin perform public.nutrition_api('log',s,l,jsonb_build_object('plan_version',published->'published_version','meal_id','breakfast','day',current_date::text,'status','partial','note','','entry_version',0));exception when others then denied:=true;end;if not denied then raise exception 'Stale log accepted';end if;
 entry:=public.nutrition_api('log',s,l,jsonb_build_object('plan_version',published->'published_version','meal_id','breakfast','day',current_date::text,'status','partial','note','Parte da refeição','entry_version',entry->'version'));
 entry:=public.nutrition_api('log',s,l,jsonb_build_object('plan_version',published->'published_version','meal_id','breakfast','day',current_date::text,'status','pending','note','','entry_version',entry->'version'));
 if entry->>'status'<>'pending' then raise exception 'Undo failed';end if;
 denied:=false;begin perform public.nutrition_api('log',s,l,jsonb_build_object('plan_version',published->'published_version','meal_id','unknown','day',current_date::text,'status','done','note','','entry_version',0));exception when others then denied:=true;end;if not denied then raise exception 'Unknown meal accepted';end if;
 doc:=jsonb_set(doc,'{title}','"Plano revisado"');
 w:=public.nutrition_api('save',p,l,jsonb_build_object('version',published->'version','content',doc));
 if public.nutrition_api('read',s,l)->'plan'->'published'->>'title'<>'Plano de teste' then raise exception 'Unpublished revision leaked';end if;
 w:=public.nutrition_api('publish',p,l,jsonb_build_object('version',w->'version'));
 denied:=false;begin perform public.nutrition_api('log',s,l,jsonb_build_object('plan_version',published->'published_version','meal_id','breakfast','day',current_date::text,'status','done','note','','entry_version',entry->'version'));exception when others then denied:=true;end;if not denied then raise exception 'Old plan version accepted';end if;
 response:=public.nutrition_api('read',p,l);
 if jsonb_array_length(response->'entries')<>1 then raise exception 'Old history lost';end if;
 w:=public.nutrition_api('unpublish',p,l,jsonb_build_object('version',w->'version'));
 if w->'published'<>'null'::jsonb or w->'draft'->>'title'<>'Plano revisado' then raise exception 'Unpublish lost draft';end if;
 denied:=false;begin perform fitto_private.validate_nutrition(jsonb_set(doc,'{meals,0,foods,0,quantity}','""'),true);exception when others then denied:=true;end;if not denied then raise exception 'Missing quantity accepted';end if;
 denied:=false;begin perform fitto_private.validate_nutrition(jsonb_set(doc,'{meals,0,time}','"25:00"'),true);exception when others then denied:=true;end;if not denied then raise exception 'Invalid time accepted';end if;
 perform set_config('request.jwt.claim.sub',other_u::text,true);
 denied:=false;begin perform public.nutrition_api('read',other_p,l);exception when others then denied:=true;end;if not denied then raise exception 'Other professional access';end if;
 perform set_config('request.jwt.claim.sub',trainer_u::text,true);
 denied:=false;begin perform public.nutrition_api('read',trainer_p,trainer_l);exception when others then denied:=true;end;if not denied then raise exception 'Wrong specialty accepted';end if;
 response:=public.enable_nutrition(trainer_p);
 if not (response->'specialties' ? 'Nutricionista') or not (response->'specialties' ? 'Treinador') then raise exception 'Activation removed original specialty';end if;
 perform public.nutrition_api('read',trainer_p,trainer_l);
 denied:=false;begin perform public.enable_nutrition(other_p);exception when others then denied:=true;end;if not denied then raise exception 'Other profile activation accepted';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 denied:=false;begin perform public.enable_nutrition(s);exception when others then denied:=true;end;if not denied then raise exception 'Student activation accepted';end if;
 update fitto_private.links set status='ended' where id=l;
 denied:=false;begin perform public.nutrition_api('read',s,l);exception when others then denied:=true;end;if not denied then raise exception 'Ended link access';end if;
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;begin perform public.nutrition_api('read',s,l);exception when others then denied:=true;end;if not denied then raise exception 'Unauthenticated access';end if;
 if has_function_privilege('anon','public.enable_nutrition(uuid)','execute') then raise exception 'Anonymous activation exposed';end if;
 if has_function_privilege('anon','public.nutrition_api(text,uuid,uuid,jsonb)','execute') or has_table_privilege('authenticated','fitto_private.nutrition_plans','select') or has_table_privilege('authenticated','fitto_private.nutrition_entries','select') then raise exception 'Direct access exposed';end if;
end $$;
rollback;
select 'PASS: self-account nutrition, draft privacy, save/publish/withdraw, version conflicts, meal logs and undo, history snapshots, ownership, specialty and ended links' as result;
