-- Integration test: all fixtures and mutations are rolled back.
begin;
do $$
declare
 u1 uuid:=gen_random_uuid(); u2 uuid:=gen_random_uuid(); u3 uuid:=gen_random_uuid(); u4 uuid:=gen_random_uuid();
 p1 uuid:=gen_random_uuid(); p2 uuid:=gen_random_uuid(); s1 uuid:=gen_random_uuid(); s2 uuid:=gen_random_uuid();
 inv jsonb; inv2 jsonb; r jsonb; lid uuid; denied boolean; i int;
begin
 insert into auth.users(id) values(u1),(u2),(u3),(u4);
 insert into public.profiles(id,user_id,role,display_name,username,specialties) values
 (p1,u1,'professional','Test Trainer','t_'||substr(replace(p1::text,'-',''),1,12),array['Treinador']),
 (p2,u4,'professional','Test Nutrition','t_'||substr(replace(p2::text,'-',''),1,12),array['Nutricionista']),
 (s1,u2,'student','Test Student','t_'||substr(replace(s1::text,'-',''),1,12),'{}'),
 (s2,u3,'student','Test Other','t_'||substr(replace(s2::text,'-',''),1,12),'{}');
 perform set_config('request.jwt.claim.sub',u1::text,true);
 inv:=public.relationship_api('invite',jsonb_build_object('profile_id',p1));
 if length(inv->>'code')<>6 or length(inv->>'token')<>64 then raise exception 'Invalid invite'; end if;
 perform public.relationship_api('contact',jsonb_build_object('profile_id',p1,'whatsapp','5511999999999'));
 perform set_config('request.jwt.claim.sub',u2::text,true);
 r:=public.relationship_api('preview',jsonb_build_object('profile_id',s1,'credential',inv->>'code'));
 if r->>'name'<>'Test Trainer' then raise exception 'Preview failed'; end if;
 perform public.relationship_api('request',jsonb_build_object('profile_id',s1,'credential',inv->>'token'));
 r:=public.relationship_api('dashboard',jsonb_build_object('profile_id',s1));
 if r->'links'->0->>'status'<>'pending' or r->'links'->0->>'whatsapp' is not null then raise exception 'Pending privacy failed'; end if;
 lid:=(r->'links'->0->>'id')::uuid;
 denied:=false;
 begin perform public.relationship_api('approve',jsonb_build_object('profile_id',s1,'link_id',lid)); exception when others then denied:=true; end;
 if not denied then raise exception 'Student approved own request'; end if;
 denied:=false;
 begin perform public.relationship_api('dashboard',jsonb_build_object('profile_id',p1)); exception when others then denied:=true; end;
 if not denied then raise exception 'Cross-account access'; end if;
 r:=public.relationship_api('preview',jsonb_build_object('profile_id',s1,'credential',inv->>'code'));
 if r->>'error' is null then raise exception 'Consumed invite reused'; end if;
 perform set_config('request.jwt.claim.sub',u1::text,true);
 perform public.relationship_api('approve',jsonb_build_object('profile_id',p1,'link_id',lid));
 inv2:=public.relationship_api('invite',jsonb_build_object('profile_id',p1));
 perform set_config('request.jwt.claim.sub',u3::text,true);
 perform public.relationship_api('request',jsonb_build_object('profile_id',s2,'credential',inv2->>'code'));
 perform set_config('request.jwt.claim.sub',u1::text,true);
 denied:=false;
 begin
  perform public.relationship_api('approve',jsonb_build_object('profile_id',p1,'link_id',(select id from fitto_private.links where student_id=s2)));
 exception when others then denied:=true; end;
 if not denied then raise exception 'Capacity bypass'; end if;
 perform public.relationship_api('reject',jsonb_build_object('profile_id',p1,'link_id',(select id from fitto_private.links where student_id=s2)));
 perform set_config('request.jwt.claim.sub',u4::text,true);
 inv2:=public.relationship_api('invite',jsonb_build_object('profile_id',p2));
 perform set_config('request.jwt.claim.sub',u2::text,true);
 perform public.relationship_api('request',jsonb_build_object('profile_id',s1,'credential',inv2->>'code'));
 perform set_config('request.jwt.claim.sub',u4::text,true);
 perform public.relationship_api('approve',jsonb_build_object('profile_id',p2,'link_id',(select id from fitto_private.links where professional_id=p2)));
 perform set_config('request.jwt.claim.sub',u2::text,true);
 r:=public.relationship_api('dashboard',jsonb_build_object('profile_id',s1));
 if jsonb_array_length(r->'links')<>2 then raise exception 'Two professionals failed'; end if;
 if not exists(select 1 from jsonb_array_elements(r->'links') l where l->>'whatsapp'='5511999999999') then raise exception 'Active contact missing'; end if;
 perform public.relationship_api('end',jsonb_build_object('profile_id',s1,'link_id',lid));
 if (select status from fitto_private.links where professional_id=p2)<>'active' then raise exception 'Other professional affected'; end if;
 perform set_config('request.jwt.claim.sub',u3::text,true);
 for i in 1..5 loop
  r:=public.relationship_api('preview',jsonb_build_object('profile_id',s2,'credential','invalid'));
 end loop;
 if (r->>'blocked_until')::timestamptz<now()+interval '4 minutes' then raise exception 'Rate limit missing'; end if;
 r:=public.relationship_api('dashboard',jsonb_build_object('profile_id',s2));
 if r->>'blocked_until' is null then raise exception 'Block lost after reload'; end if;
 update fitto_private.attempts set blocked_until=now()-interval '1 second' where user_id=u3;
 r:=public.relationship_api('preview',jsonb_build_object('profile_id',s2,'credential','invalid'));
 if (r->>'remaining')::int<>4 then raise exception 'Cooldown reset failed'; end if;
 perform set_config('request.jwt.claim.sub',u1::text,true);
 inv:=public.relationship_api('invite',jsonb_build_object('profile_id',p1));
 inv2:=public.relationship_api('invite',jsonb_build_object('profile_id',p1));
 perform set_config('request.jwt.claim.sub',u3::text,true);
 r:=public.relationship_api('preview',jsonb_build_object('profile_id',s2,'credential',inv->>'code'));
 if r->>'error' is null then raise exception 'Old invite not invalidated'; end if;
 update fitto_private.invites set expires_at=now()-interval '1 second' where token=inv2->>'token';
 r:=public.relationship_api('preview',jsonb_build_object('profile_id',s2,'credential',inv2->>'code'));
 if r->>'error' is null then raise exception 'Expired invite accepted'; end if;
 if has_function_privilege('anon','public.relationship_api(text,jsonb)','execute') then raise exception 'Anonymous RPC exposed'; end if;
 if has_table_privilege('authenticated','fitto_private.invites','select') then raise exception 'Invitation secrets exposed'; end if;
end $$;
rollback;
select 'PASS: invitations, approvals, capacity, privacy, two professionals, refusal, termination, rate limiting, cooldown, expiry, privileges' as result;
