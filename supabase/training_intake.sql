create table fitto_private.training_intake (
 student_id uuid primary key references public.profiles(id) on delete cascade,
 goal text not null default '' check(char_length(goal)<=500),
 difficulties text not null default '' check(char_length(difficulties)<=500),
 experience text not null default '' check(experience in ('','beginner','intermediate','advanced')),
 days text[] not null default '{}' check(cardinality(days)<=7 and days <@ array['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']::text[]),
 minutes integer check(minutes between 10 and 300),
 place text not null default '' check(place in ('','gym','home','outdoors','mixed')),
 equipment text not null default '' check(char_length(equipment)<=500),
 preferences text not null default '' check(char_length(preferences)<=500),
 shared boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table fitto_private.training_intake enable row level security;
revoke all on fitto_private.training_intake from public,anon,authenticated;
create function fitto_private.training_intake_api(action text, profile_id uuid, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; target uuid; record fitto_private.training_intake;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
 select * into p from public.profiles where id=profile_id and user_id=auth.uid();
 if p.id is null then raise exception 'Perfil não autorizado.'; end if;
 if action in ('read','save') and p.role='student' then
  target:=p.id;
  if action='save' then
   insert into fitto_private.training_intake(student_id,goal,difficulties,experience,days,minutes,place,equipment,preferences,shared)
   values(p.id,coalesce(payload->>'goal',''),coalesce(payload->>'difficulties',''),coalesce(payload->>'experience',''),
    array(select distinct jsonb_array_elements_text(coalesce(payload->'days','[]'))),nullif(payload->>'minutes','')::integer,
    coalesce(payload->>'place',''),coalesce(payload->>'equipment',''),coalesce(payload->>'preferences',''),coalesce((payload->>'shared')::boolean,false))
   on conflict(student_id) do update set goal=excluded.goal,difficulties=excluded.difficulties,experience=excluded.experience,
    days=excluded.days,minutes=excluded.minutes,place=excluded.place,equipment=excluded.equipment,preferences=excluded.preferences,shared=excluded.shared,updated_at=now();
  end if;
 elsif action='read' and p.role='professional' and 'Treinador'=any(p.specialties) then
  select student_id into target from fitto_private.links where id=(payload->>'link_id')::uuid and professional_id=p.id and status='active';
  if target is null then raise exception 'A ficha exige um vínculo ativo com o aluno.'; end if;
 else raise exception 'Operação não autorizada.';
 end if;
 select * into record from fitto_private.training_intake where student_id=target;
 if p.role='professional' and (record.student_id is null or not record.shared) then return jsonb_build_object('shared',false); end if;
 if record.student_id is null then return '{}'::jsonb; end if;
 return coalesce(to_jsonb(record),'{}');
end $$;
revoke all on function fitto_private.training_intake_api(text,uuid,jsonb) from public,anon;
grant execute on function fitto_private.training_intake_api(text,uuid,jsonb) to authenticated;
create function public.training_intake_api(action text, profile_id uuid, payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select fitto_private.training_intake_api(action,profile_id,payload) $$;
revoke all on function public.training_intake_api(text,uuid,jsonb) from public,anon;
grant execute on function public.training_intake_api(text,uuid,jsonb) to authenticated;
