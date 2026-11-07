-- Capacity plans are self-service and free during this phase.
-- All writes go through the existing ownership-checked relationship RPC.
begin;
create table if not exists fitto_private.professional_plans (
  professional_id uuid primary key references public.profiles(id) on delete cascade,
  capacity integer not null check (capacity in (10,25,50,100) or capacity between 101 and 99999),
  updated_at timestamptz not null default now()
);
alter table fitto_private.professional_plans enable row level security;
revoke all on fitto_private.professional_plans from public, anon, authenticated;

do $migration$
declare
 definition text;
 previous_definition text;
begin
 definition := pg_get_functiondef('fitto_private.relationship_api(text,jsonb)'::regprocedure);
 if position('action=''set_plan''' in definition)>0 then
   raise notice 'Professional plans already installed';
   return;
 end if;
 previous_definition := definition;
 definition := replace(definition, '''limit'',1,', '''limit'',coalesce((select capacity from fitto_private.professional_plans where professional_id=p.id),1),');
 if definition=previous_definition then raise exception 'Dashboard capacity marker missing'; end if;

 previous_definition := definition;
 definition := replace(definition,
   'existing.status=''active'' and student.user_id<>uid)>=1 then',
   'existing.status=''active'' and student.user_id<>uid)>=coalesce((select capacity from fitto_private.professional_plans where professional_id=p.id),1) then');
 if definition=previous_definition then raise exception 'Self-aware approval capacity marker missing'; end if;
 definition := regexp_replace(definition,
   'raise exception ''Plano gratuito:[^'']*'';',
   'raise exception ''Limite de alunos ativos atingido. Aumente a capacidade do plano ou encerre um vínculo.'';');

 previous_definition := definition;
 definition := replace(definition, 'if action=''dashboard'' then', $branch$
 if action='set_plan' then
   if p.role<>'professional' then raise exception 'Somente profissionais podem alterar o plano.'; end if;
   if jsonb_typeof(payload->'capacity') is distinct from 'number'
     or (payload->>'capacity') !~ '^[0-9]{1,5}$'
     or not ((payload->>'capacity')::integer in (10,25,50,100) or (payload->>'capacity')::integer between 101 and 99999)
   then raise exception 'Escolha uma capacidade válida.'; end if;
   perform pg_advisory_xact_lock(hashtextextended(p.id::text,0));
   if (payload->>'capacity')::integer < coalesce((select capacity from fitto_private.professional_plans where professional_id=p.id),1) then
     raise exception 'Escolha o plano atual ou uma capacidade maior.';
   end if;
   if (payload->>'capacity')::integer < (select count(*) from fitto_private.links l join public.profiles student on student.id=l.student_id where l.professional_id=p.id and l.status='active' and student.user_id<>uid) then
     raise exception 'A capacidade deve comportar seus alunos ativos.';
   end if;
   insert into fitto_private.professional_plans(professional_id,capacity) values(p.id,(payload->>'capacity')::integer)
   on conflict(professional_id) do update set capacity=excluded.capacity,updated_at=now()
   where professional_plans.capacity<>excluded.capacity;
   return fitto_private.relationship_api('dashboard',jsonb_build_object('profile_id',p.id));
 elsif action='dashboard' then
 $branch$);
 if definition=previous_definition then raise exception 'Dashboard branch marker missing'; end if;
 execute definition;
end $migration$;
commit;
