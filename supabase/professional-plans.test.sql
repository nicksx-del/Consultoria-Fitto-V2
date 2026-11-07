-- All fixtures and plan changes are rolled back.
begin;
do $test$
declare
 owner_id uuid:=gen_random_uuid();
 other_id uuid:=gen_random_uuid();
 professional uuid:=gen_random_uuid();
 other_professional uuid:=gen_random_uuid();
 self_student uuid:=gen_random_uuid();
 student_id uuid;
 student_user uuid;
 link_id uuid;
 last_link uuid;
 self_link uuid;
 first_student uuid;
 r jsonb;
 invalid jsonb;
 denied boolean;
 previous_time timestamptz;
 i integer;
begin
 insert into auth.users(id) values(owner_id),(other_id);
 insert into public.profiles(id,user_id,role,display_name,username,specialties) values
 (professional,owner_id,'professional','Plan Test','t_'||substr(replace(professional::text,'-',''),1,12),array['Treinador']),
 (other_professional,other_id,'professional','Other Test','t_'||substr(replace(other_professional::text,'-',''),1,12),array['Treinador']),
 (self_student,owner_id,'student','Self Test','t_'||substr(replace(self_student::text,'-',''),1,12),'{}');
 insert into fitto_private.links(professional_id,student_id,status) values(professional,self_student,'pending') returning id into self_link;
 for i in 1..11 loop
   student_id:=gen_random_uuid(); student_user:=gen_random_uuid();
   insert into auth.users(id) values(student_user);
   insert into public.profiles(id,user_id,role,display_name,username,specialties)
   values(student_id,student_user,'student','Student Test','t_'||substr(replace(student_id::text,'-',''),1,12),'{}');
   if i=1 then first_student:=student_id; end if;
   insert into fitto_private.links(professional_id,student_id,status) values(professional,student_id,'pending') returning id into last_link;
 end loop;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 r:=public.relationship_api('dashboard',jsonb_build_object('profile_id',professional));
 if (r->>'limit')::integer<>1 then raise exception 'Legacy default changed'; end if;
 for invalid in select value from jsonb_array_elements('[0,2,11,26,100000,-1,1.5,null,"25",{},[]]') loop
   denied:=false;
   begin
     perform public.relationship_api('set_plan',jsonb_build_object('profile_id',professional,'capacity',invalid));
   exception when others then denied:=true;
   end;
   if not denied then raise exception 'Invalid capacity accepted: %',invalid; end if;
 end loop;
 r:=public.relationship_api('set_plan',jsonb_build_object('profile_id',professional,'capacity',10));
 if (r->>'limit')::integer<>10 then raise exception 'Upgrade not returned'; end if;
 select updated_at into previous_time from fitto_private.professional_plans where professional_id=professional;
 perform public.relationship_api('set_plan',jsonb_build_object('profile_id',professional,'capacity',10));
 if (select updated_at from fitto_private.professional_plans where professional_id=professional)<>previous_time then raise exception 'Retry changed state'; end if;
 for link_id in select id from fitto_private.links where professional_id=professional and id not in (last_link,self_link) loop
   perform public.relationship_api('approve',jsonb_build_object('profile_id',professional,'link_id',link_id));
 end loop;
 perform public.relationship_api('approve',jsonb_build_object('profile_id',professional,'link_id',self_link));
 denied:=false;
 begin
   perform public.relationship_api('approve',jsonb_build_object('profile_id',professional,'link_id',last_link));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Capacity bypass'; end if;
 if (select status from fitto_private.links where id=last_link)<>'pending' then raise exception 'Failed approval lost pending request'; end if;
 r:=public.relationship_api('set_plan',jsonb_build_object('profile_id',professional,'capacity',25));
 perform public.relationship_api('approve',jsonb_build_object('profile_id',professional,'link_id',last_link));
 if (select count(*) from fitto_private.links where professional_id=professional and status='active')<>12 then raise exception 'New slot or self exemption failed'; end if;
 denied:=false;
 begin
   perform public.relationship_api('set_plan',jsonb_build_object('profile_id',professional,'capacity',10));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Downgrade accepted'; end if;
 r:=public.relationship_api('set_plan',jsonb_build_object('profile_id',professional,'capacity',157));
 if (r->>'limit')::integer<>157 then raise exception 'Custom capacity not persisted'; end if;
 r:=public.relationship_api('dashboard',jsonb_build_object('profile_id',professional));
 if (r->>'limit')::integer<>157 then raise exception 'Dashboard lost plan'; end if;
 denied:=false;
 begin
   perform public.relationship_api('set_plan',jsonb_build_object('profile_id',self_student,'capacity',25));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Student changed plan'; end if;
 perform set_config('request.jwt.claim.sub',other_id::text,true);
 denied:=false;
 begin
   perform public.relationship_api('set_plan',jsonb_build_object('profile_id',professional,'capacity',100));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Cross-owner plan change'; end if;
 r:=public.relationship_api('dashboard',jsonb_build_object('profile_id',other_professional));
 if (r->>'limit')::integer<>1 then raise exception 'Other professional affected'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;
 begin
   perform public.relationship_api('set_plan',jsonb_build_object('profile_id',professional,'capacity',100));
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'Anonymous change'; end if;
 if has_table_privilege('authenticated','fitto_private.professional_plans','insert,update,select') then raise exception 'Private plan table exposed'; end if;
 if has_function_privilege('anon','public.relationship_api(text,jsonb)','execute') then raise exception 'Anonymous RPC exposed'; end if;
 if not (select relrowsecurity from pg_class where oid='fitto_private.professional_plans'::regclass) then raise exception 'RLS missing'; end if;
end $test$;
rollback;
select 'PASS: default capacity, validation, persisted upgrades, idempotent retries, self exemption, last slot and boundary enforcement, pending preservation, custom capacity, downgrade prevention, ownership, student and anonymous denial, RLS and privileges' as result;
