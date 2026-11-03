begin;
do $$
declare u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(u),(v);
 insert into public.profiles(id,user_id,role,display_name,username,specialties) values
 (a,u,'student','Test Student','t_'||substr(replace(a::text,'-',''),1,12),'{}'),
 (b,u,'professional','Test Professional','t_'||substr(replace(b::text,'-',''),1,12),array['Treinador']),
 (c,v,'student','Test Other','t_'||substr(replace(c::text,'-',''),1,12),'{}');
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('fitto.test_own',a::text,true);
 perform set_config('fitto.test_professional',b::text,true);
 perform set_config('fitto.test_other',c::text,true);
end $$;
set local role authenticated;
do $$
declare rows_changed int; denied boolean:=false;
begin
 update public.profiles set display_name='Edited student',bio='My bio',location='Itajubá, MG',website='https://example.com',focus='Consistency',avatar_url='data:image/png;base64,aGVsbG8=' where id=current_setting('fitto.test_own')::uuid;
 get diagnostics rows_changed=row_count;
 if rows_changed<>1 then raise exception 'Own update failed'; end if;
 if (select display_name from public.profiles where id=current_setting('fitto.test_professional')::uuid)<>'Test Professional' then raise exception 'Other role modified'; end if;
 update public.profiles set bio='Forbidden' where id=current_setting('fitto.test_other')::uuid;
 get diagnostics rows_changed=row_count;
 if rows_changed<>0 then raise exception 'Cross-account update allowed'; end if;
 begin update public.profiles set role='professional' where id=current_setting('fitto.test_own')::uuid; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Role modification allowed'; end if;
 denied:=false;
 begin update public.profiles set user_id=gen_random_uuid() where id=current_setting('fitto.test_own')::uuid; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Ownership modification allowed'; end if;
 denied:=false;
 begin update public.profiles set website='javascript:alert(1)' where id=current_setting('fitto.test_own')::uuid; exception when check_violation then denied:=true; end;
 if not denied then raise exception 'Unsafe link accepted'; end if;
 denied:=false;
 begin update public.profiles set username=(select username from public.profiles where id=current_setting('fitto.test_professional')::uuid) where id=current_setting('fitto.test_own')::uuid; exception when unique_violation then denied:=true; end;
 if not denied then raise exception 'Duplicate username accepted'; end if;
 update public.profiles set avatar_url=null where id=current_setting('fitto.test_own')::uuid;
end $$;
rollback;
select 'PASS: profile editing, photo removal, role separation, account isolation, immutable ownership and role, safe links, unique username' as result;
