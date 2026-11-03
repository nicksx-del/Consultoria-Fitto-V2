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

 response:=public.nutrition_tools(p,'read');
 if (response->>'version')::int<>0 then raise exception 'Unexpected initial tools';end if;
 response:=public.nutrition_tools(p,'save',jsonb_build_object('version',0,'content',jsonb_build_object('favorites','[1,3]'::jsonb,'recent','[3,1]'::jsonb,'templates',doc->'meals')));
 if (response->>'version')::int<>1 or response->'content'->'favorites'<>'[1,3]'::jsonb then raise exception 'Tool save failed';end if;
 response:=public.nutrition_tools(p,'read');
 if jsonb_array_length(response->'content'->'templates')<>1 then raise exception 'Template lost';end if;
 response:=public.nutrition_tools(p,'plans');
 if jsonb_array_length(response)<>1 then raise exception 'Plan source missing';end if;
 denied:=false;begin perform public.nutrition_tools(p,'save',jsonb_build_object('version',0,'content','{}'::jsonb));exception when others then denied:=true;end;if not denied then raise exception 'Stale toolbox write';end if;
 denied:=false;begin perform public.nutrition_tools(s,'read');exception when others then denied:=true;end;if not denied then raise exception 'Student tools access';end if;
 denied:=false;begin perform public.nutrition_tools(other_p,'read');exception when others then denied:=true;end;if not denied then raise exception 'Other profile tools';end if;
 denied:=false;begin perform public.nutrition_tools(p,'save',jsonb_build_object('version',1,'content',jsonb_build_object('favorites','[999]'::jsonb,'recent','[]'::jsonb,'templates','[]'::jsonb)));exception when others then denied:=true;end;if not denied then raise exception 'Invalid food id';end if;
 perform set_config('request.jwt.claim.sub',other_u::text,true);
 response:=public.nutrition_tools(other_p,'plans');if jsonb_array_length(response)<>0 then raise exception 'Other professional plans leaked';end if;
 perform set_config('request.jwt.claim.sub',trainer_u::text,true);
 denied:=false;begin perform public.nutrition_tools(trainer_p,'read');exception when others then denied:=true;end;if not denied then raise exception 'Wrong specialty tools';end if;
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;begin perform public.nutrition_tools(p,'read');exception when others then denied:=true;end;if not denied then raise exception 'Anon tools';end if;
 if has_function_privilege('anon','public.nutrition_tools(uuid,text,jsonb)','execute') or has_table_privilege('authenticated','fitto_private.nutrition_toolbox','select') then raise exception 'Direct tools access';end if;
end $$;
select 'PASS: toolbox persistence, templates, plan copy ownership, stale versions, food validation, student and anonymous denial' result;
rollback;
