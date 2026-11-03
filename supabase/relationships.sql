-- Versioned source for the relationships API. Applied to the hosted database.
create schema if not exists fitto_private;
revoke all on schema fitto_private from public, anon;
grant usage on schema fitto_private to authenticated;

create table fitto_private.invites (
 id uuid primary key default gen_random_uuid(), professional_id uuid not null references public.profiles(id),
 code text not null, token text not null unique, expires_at timestamptz not null default now()+interval '24 hours',
 consumed boolean not null default false
);
create unique index invites_available_code on fitto_private.invites(code) where not consumed;
create index on fitto_private.invites(professional_id);
create table fitto_private.links (
 id uuid primary key default gen_random_uuid(), professional_id uuid not null references public.profiles(id),
 student_id uuid not null references public.profiles(id), status text not null check(status in ('pending','active','rejected','ended')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(professional_id,student_id)
);
create index on fitto_private.links(student_id);
create table fitto_private.attempts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 failures int not null default 0, blocked_until timestamptz
);
create table fitto_private.contacts (
 professional_id uuid primary key references public.profiles(id), whatsapp text not null check(whatsapp ~ '^[1-9][0-9]{9,14}$')
);
alter table fitto_private.invites enable row level security;
alter table fitto_private.links enable row level security;
alter table fitto_private.attempts enable row level security;
alter table fitto_private.contacts enable row level security;
revoke all on all tables in schema fitto_private from public,anon,authenticated;

-- Privileged code is isolated from the exposed schema. Every action checks ownership.
create function fitto_private.relationship_api(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); p public.profiles; other public.profiles;
 inv fitto_private.invites; link fitto_private.links; attempts fitto_private.attempts;
 result jsonb; code_value text; bytes bytea; prof_id uuid;
begin
 if uid is null then raise exception 'Autenticação necessária.'; end if;
 select * into p from public.profiles where id=(payload->>'profile_id')::uuid and user_id=uid;
 if p.id is null then raise exception 'Perfil não autorizado.'; end if;
 if action='dashboard' then
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'status',l.status,'created_at',l.created_at,
   'name',o.display_name,'username',o.username,'specialties',o.specialties,
   'whatsapp',case when l.status='active' and p.role='student' then c.whatsapp else null end) order by l.updated_at desc),'[]')
  into result from fitto_private.links l join public.profiles o on o.id=case when p.role='professional' then l.student_id else l.professional_id end
  left join fitto_private.contacts c on c.professional_id=l.professional_id
  where (p.role='professional' and l.professional_id=p.id) or (p.role='student' and l.student_id=p.id);
  return jsonb_build_object('links',result,'limit',1,'whatsapp',(select whatsapp from fitto_private.contacts where professional_id=p.id),
   'blocked_until',(select blocked_until from fitto_private.attempts where user_id=uid));
 elsif action='contact' and p.role='professional' then
  code_value:=payload->>'whatsapp';
  if code_value='' then delete from fitto_private.contacts where professional_id=p.id;
  elsif code_value ~ '^[1-9][0-9]{9,14}$' then
   insert into fitto_private.contacts values(p.id,code_value) on conflict(professional_id) do update set whatsapp=excluded.whatsapp;
  else raise exception 'Informe o WhatsApp com código do país e DDD.'; end if;
  return jsonb_build_object('ok',true);
 elsif action='invite' and p.role='professional' then
  perform pg_advisory_xact_lock(hashtextextended(p.id::text,0));
  update fitto_private.invites set consumed=true where professional_id=p.id or expires_at<=now();
  loop
   bytes:=extensions.gen_random_bytes(3);
   code_value:=lpad(((get_byte(bytes,0)*65536+get_byte(bytes,1)*256+get_byte(bytes,2))%1000000)::text,6,'0');
   exit when not exists(select 1 from fitto_private.invites where code=code_value and not consumed);
  end loop;
  insert into fitto_private.invites(professional_id,code,token) values(p.id,code_value,encode(extensions.gen_random_bytes(32),'hex')) returning * into inv;
  return jsonb_build_object('code',inv.code,'token',inv.token,'expires_at',inv.expires_at);
 elsif action in ('preview','request') and p.role='student' then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
  insert into fitto_private.attempts(user_id) values(uid) on conflict do nothing;
  select * into attempts from fitto_private.attempts where user_id=uid for update;
  if attempts.blocked_until>now() then return jsonb_build_object('error','Limite de tentativas. Aguarde para tentar novamente.','blocked_until',attempts.blocked_until); end if;
  if attempts.blocked_until is not null then
   update fitto_private.attempts set failures=0,blocked_until=null where user_id=uid;
   attempts.failures:=0;
  end if;
  select * into inv from fitto_private.invites where not consumed and expires_at>now()
   and (case when length(coalesce(payload->>'credential',''))=64 then token=payload->>'credential' else code=payload->>'credential' end) for update;
  if inv.id is null then
   update fitto_private.attempts set failures=failures+1,blocked_until=case when failures+1>=5 then now()+interval '5 minutes' else null end where user_id=uid returning * into attempts;
   return jsonb_build_object('error','Convite inválido, expirado ou já utilizado.','blocked_until',attempts.blocked_until,'remaining',greatest(0,5-attempts.failures));
  end if;
  select * into other from public.profiles where id=inv.professional_id;
  if other.user_id=uid then raise exception 'Você não pode vincular seus próprios perfis.'; end if;
  if action='preview' then return jsonb_build_object('name',other.display_name,'username',other.username,'specialties',other.specialties); end if;
  if exists(select 1 from fitto_private.links where professional_id=other.id and student_id=p.id and status in ('pending','active')) then
   raise exception 'Você já possui um vínculo ou solicitação com este profissional.';
  end if;
  insert into fitto_private.links(professional_id,student_id,status) values(other.id,p.id,'pending')
   on conflict(professional_id,student_id) do update set status='pending',created_at=now(),updated_at=now();
  update fitto_private.invites set consumed=true where id=inv.id;
  return jsonb_build_object('ok',true);
 elsif action in ('approve','reject','end') then
  -- Serialize all capacity changes for this professional, including concurrent approvals.
  select professional_id into prof_id from fitto_private.links where id=(payload->>'link_id')::uuid
   and ((professional_id=p.id and p.role='professional') or (student_id=p.id and p.role='student'));
  if prof_id is null then raise exception 'Vínculo não autorizado.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(prof_id::text,0));
  select * into link from fitto_private.links where id=(payload->>'link_id')::uuid for update;
  if action in ('approve','reject') then
   if p.role<>'professional' or link.status<>'pending' then raise exception 'Solicitação indisponível.'; end if;
   if action='approve' and (select count(*) from fitto_private.links where professional_id=p.id and status='active')>=1 then
    raise exception 'Plano gratuito: limite de 1 aluno ativo. Encerre um vínculo antes de aprovar outro.';
   end if;
  elsif link.status<>'active' then raise exception 'Este vínculo não está ativo.';
  end if;
  update fitto_private.links set status=case action when 'approve' then 'active' when 'reject' then 'rejected' else 'ended' end,updated_at=now() where id=link.id;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Operação não autorizada.';
end $$;
revoke all on function fitto_private.relationship_api(text,jsonb) from public,anon;
grant execute on function fitto_private.relationship_api(text,jsonb) to authenticated;
create function public.relationship_api(action text, payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select fitto_private.relationship_api(action,payload) $$;
revoke all on function public.relationship_api(text,jsonb) from public,anon;
grant execute on function public.relationship_api(text,jsonb) to authenticated;
