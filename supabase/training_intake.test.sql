begin;
do $$
declare s uuid:=gen_random_uuid();t uuid:=gen_random_uuid();n uuid:=gen_random_uuid();x uuid:=gen_random_uuid();sp uuid:=gen_random_uuid();tp uuid:=gen_random_uuid();np uuid:=gen_random_uuid();xp uuid:=gen_random_uuid();l uuid:=gen_random_uuid();nl uuid:=gen_random_uuid();r jsonb;denied boolean;
begin
 insert into auth.users(id) values(s),(t),(n),(x);
 insert into public.profiles(id,user_id,role,display_name,username,specialties) values
 (sp,s,'student','Test Student','t_'||substr(replace(sp::text,'-',''),1,12),'{}'),
 (tp,t,'professional','Test Trainer','t_'||substr(replace(tp::text,'-',''),1,12),array['Treinador']),
 (np,n,'professional','Test Nutrition','t_'||substr(replace(np::text,'-',''),1,12),array['Nutricionista']),
 (xp,x,'professional','Test Other','t_'||substr(replace(xp::text,'-',''),1,12),array['Treinador']);
 insert into fitto_private.links(id,professional_id,student_id,status) values(l,tp,sp,'active'),(nl,np,sp,'active');
 perform set_config('request.jwt.claim.sub',s::text,true);
 if public.training_intake_api('read',sp)<>'{}'::jsonb then raise exception 'Empty intake invalid';end if;
 r:=public.training_intake_api('save',sp,'{"goal":"Strength","experience":"beginner","days":["Seg","Qua"],"minutes":60,"place":"gym","equipment":"Dumbbells","preferences":"Free weights","shared":false}');
 if r->>'goal'<>'Strength' or (r->>'minutes')::int<>60 then raise exception 'Save failed';end if;
 perform set_config('request.jwt.claim.sub',t::text,true);
 r:=public.training_intake_api('read',tp,jsonb_build_object('link_id',l));
 if r<>'{"shared":false}'::jsonb then raise exception 'Private data leaked';end if;
 perform set_config('request.jwt.claim.sub',s::text,true);
 perform public.training_intake_api('save',sp,'{"goal":"Strength","minutes":60,"shared":true}');
 perform set_config('request.jwt.claim.sub',t::text,true);
 r:=public.training_intake_api('read',tp,jsonb_build_object('link_id',l));
 if r->>'goal'<>'Strength' then raise exception 'Authorized read failed';end if;
 denied:=false;
 begin perform public.training_intake_api('save',tp,'{}');exception when others then denied:=true;end;
 if not denied then raise exception 'Trainer modified intake';end if;
 perform set_config('request.jwt.claim.sub',x::text,true);
 denied:=false;
 begin perform public.training_intake_api('read',xp,jsonb_build_object('link_id',l));exception when others then denied:=true;end;
 if not denied then raise exception 'Unrelated professional read allowed';end if;
 perform set_config('request.jwt.claim.sub',n::text,true);
 denied:=false;
 begin perform public.training_intake_api('read',np,jsonb_build_object('link_id',nl));exception when others then denied:=true;end;
 if not denied then raise exception 'Nutrition read allowed';end if;
 perform set_config('request.jwt.claim.sub',t::text,true);
 update fitto_private.links set status='pending' where id=l;
 denied:=false;
 begin perform public.training_intake_api('read',tp,jsonb_build_object('link_id',l));exception when others then denied:=true;end;
 if not denied then raise exception 'Pending read allowed';end if;
 update fitto_private.links set status='ended' where id=l;
 denied:=false;
 begin perform public.training_intake_api('read',tp,jsonb_build_object('link_id',l));exception when others then denied:=true;end;
 if not denied then raise exception 'Ended read allowed';end if;
 update fitto_private.links set status='active' where id=l;
 perform set_config('request.jwt.claim.sub',s::text,true);
 perform public.training_intake_api('save',sp,'{"shared":false}');
 perform set_config('request.jwt.claim.sub',t::text,true);
 if public.training_intake_api('read',tp,jsonb_build_object('link_id',l))<>'{"shared":false}'::jsonb then raise exception 'Consent revoke failed';end if;
 perform set_config('request.jwt.claim.sub',s::text,true);
 denied:=false;
 begin perform public.training_intake_api('save',sp,'{"minutes":999}');exception when check_violation then denied:=true;end;
 if not denied then raise exception 'Invalid minutes accepted';end if;
 if has_table_privilege('authenticated','fitto_private.training_intake','select') or has_function_privilege('anon','public.training_intake_api(text,uuid,jsonb)','execute') then raise exception 'Private API exposed';end if;
end $$;
rollback;
select 'PASS: persistence, private default, explicit sharing, trainer-only active access, no trainer edits, unrelated account blocked, pending/ended links blocked, revocation, validation, privileges' as result;
