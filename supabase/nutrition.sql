create table fitto_private.nutrition_plans (
 id uuid primary key default gen_random_uuid(), link_id uuid not null unique references fitto_private.links(id),
 draft jsonb not null, published jsonb, version integer not null default 1,
 published_version integer, published_at timestamptz, updated_at timestamptz not null default now()
);
create table fitto_private.nutrition_entries (
 id uuid primary key default gen_random_uuid(), link_id uuid not null references fitto_private.links(id),
 plan_id uuid not null references fitto_private.nutrition_plans(id), plan_version integer not null,
 day date not null, meal_id text not null, meal_snapshot jsonb not null,
 status text not null check(status in ('done','partial','skipped','pending')), note text not null default '',
 version integer not null default 1, updated_at timestamptz not null default now(),
 unique(link_id,plan_version,day,meal_id)
);
create index nutrition_entries_link_day on fitto_private.nutrition_entries(link_id,day desc);
alter table fitto_private.nutrition_plans enable row level security;
alter table fitto_private.nutrition_entries enable row level security;
revoke all on fitto_private.nutrition_plans,fitto_private.nutrition_entries from public,anon,authenticated;

create function fitto_private.validate_nutrition(doc jsonb,publishing boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare meal jsonb; food jsonb; field text; ids text[]:='{}'; food_ids text[]; target_value text;
begin
 if jsonb_typeof(doc) is distinct from 'object' or octet_length(doc::text)>200000 then raise exception 'Plano alimentar inválido.';end if;
 foreach field in array array['title','goal','notes','restrictions'] loop
  if jsonb_typeof(doc->field) is distinct from 'string' or char_length(doc->>field)>1000 then raise exception 'Revise os textos do plano alimentar.';end if;
 end loop;
 if char_length(btrim(doc->>'title')) not between 2 and 100 then raise exception 'Nome do plano: de 2 a 100 caracteres.';end if;
 if jsonb_typeof(doc->'targets') is distinct from 'object' then raise exception 'Metas inválidas.';end if;
 foreach field in array array['kcal','protein','carbs','fat'] loop
  if jsonb_typeof(doc->'targets'->field) is distinct from 'string' then raise exception 'Metas inválidas.';end if;
  target_value:=doc->'targets'->>field;
  if target_value<>'' and target_value !~ '^[0-9]{1,5}([.,][0-9]{1,2})?$' then raise exception 'Informe metas numéricas ou deixe em branco.';end if;
 end loop;
 if jsonb_typeof(doc->'meals') is distinct from 'array' then raise exception 'Refeições inválidas.';end if;
 if jsonb_array_length(doc->'meals') not between 1 and 10 then raise exception 'Crie de 1 a 10 refeições.';end if;
 for meal in select value from jsonb_array_elements(doc->'meals') loop
  if jsonb_typeof(meal->'id') is distinct from 'string' or (meal->>'id') !~ '^[A-Za-z0-9_-]{1,80}$' or meal->>'id'=any(ids) then raise exception 'Identificação de refeição inválida ou repetida.';end if;
  ids:=array_append(ids,meal->>'id');
  foreach field in array array['name','time','notes'] loop
   if jsonb_typeof(meal->field) is distinct from 'string' or char_length(meal->>field)>500 then raise exception 'Revise os textos da refeição.';end if;
  end loop;
  if char_length(btrim(meal->>'name')) not between 1 and 80 then raise exception 'Informe o nome de cada refeição.';end if;
  if meal->>'time'<>'' and (meal->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Horários devem usar HH:MM.';end if;
  if jsonb_typeof(meal->'foods') is distinct from 'array' then raise exception 'Alimentos inválidos.';end if;
  if jsonb_array_length(meal->'foods')>30 or (publishing and jsonb_array_length(meal->'foods')=0) then raise exception 'Cada refeição publicada precisa de 1 a 30 alimentos.';end if;
  food_ids:='{}';
  for food in select value from jsonb_array_elements(meal->'foods') loop
   if jsonb_typeof(food->'id') is distinct from 'string' or (food->>'id') !~ '^[A-Za-z0-9_-]{1,80}$' or food->>'id'=any(food_ids) then raise exception 'Identificação de alimento inválida ou repetida.';end if;
   food_ids:=array_append(food_ids,food->>'id');
   foreach field in array array['name','quantity','substitution'] loop
    if jsonb_typeof(food->field) is distinct from 'string' or char_length(food->>field)>300 then raise exception 'Revise os textos dos alimentos.';end if;
   end loop;
   if publishing and (btrim(food->>'name')='' or btrim(food->>'quantity')='') then raise exception 'Preencha alimento e quantidade antes de publicar.';end if;
  end loop;
 end loop;
end $$;
revoke all on function fitto_private.validate_nutrition(jsonb,boolean) from public,anon,authenticated;

create function fitto_private.nutrition_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; l fitto_private.links; w fitto_private.nutrition_plans;
 entry fitto_private.nutrition_entries; result jsonb; logs jsonb; meal jsonb; day_value date;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.';end if;
 select * into p from public.profiles where id=profile_id and user_id=auth.uid();
 if p.id is null then raise exception 'Perfil não autorizado.';end if;
 select * into l from fitto_private.links where id=link_id for update;
 if l.id is null or l.status<>'active' then raise exception 'Acompanhamento não está ativo.';end if;
 if not ((p.role='professional' and p.id=l.professional_id and 'Nutricionista'=any(p.specialties)) or
 (p.role='student' and p.id=l.student_id and exists(select 1 from public.profiles professional where professional.id=l.professional_id and 'Nutricionista'=any(professional.specialties)))) then raise exception 'Acesso à alimentação não autorizado.';end if;
 select * into w from fitto_private.nutrition_plans where nutrition_plans.link_id=l.id for update;
 if action='read' then
  result:=case when w.id is null then null when p.role='professional' then to_jsonb(w) else jsonb_build_object('id',w.id,'published',w.published,'published_version',w.published_version,'published_at',w.published_at) end;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.day desc,t.updated_at desc),'[]') into logs from
   (select * from fitto_private.nutrition_entries e where e.link_id=l.id and e.day>=current_date-7 order by e.day desc,e.updated_at desc limit 300) t;
  return jsonb_build_object('plan',result,'entries',logs);
 end if;
 if action='log' then
  if p.role<>'student' or w.published is null then raise exception 'Somente o aluno pode registrar uma refeição publicada.';end if;
  if (payload->>'plan_version')::integer is distinct from w.published_version then raise exception 'O plano foi atualizado. Atualize antes de registrar.';end if;
  if coalesce(payload->>'day','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Data inválida.';end if;
  day_value:=(payload->>'day')::date;
  if day_value<current_date-7 or day_value>current_date+1 then raise exception 'Registre apenas o dia atual ou os últimos sete dias.';end if;
  select value into meal from jsonb_array_elements(w.published->'meals') where value->>'id'=payload->>'meal_id';
  if meal is null then raise exception 'Refeição não encontrada.';end if;
  if coalesce(payload->>'status','') not in ('done','partial','skipped','pending') or jsonb_typeof(payload->'note') is distinct from 'string' or char_length(payload->>'note')>500 then raise exception 'Registro de refeição inválido.';end if;
  select * into entry from fitto_private.nutrition_entries e where e.link_id=l.id and e.plan_version=w.published_version and e.day=day_value and e.meal_id=meal->>'id' for update;
  if (payload->>'entry_version')::integer is distinct from coalesce(entry.version,0) then raise exception 'O registro mudou em outra sessão. Atualize para continuar.';end if;
  if entry.id is null then
   insert into fitto_private.nutrition_entries(link_id,plan_id,plan_version,day,meal_id,meal_snapshot,status,note) values(l.id,w.id,w.published_version,day_value,meal->>'id',meal,payload->>'status',payload->>'note') returning * into entry;
  else update fitto_private.nutrition_entries set status=payload->>'status',note=payload->>'note',version=version+1,updated_at=now() where id=entry.id returning * into entry;end if;
  return to_jsonb(entry);
 end if;
 if p.role<>'professional' then raise exception 'Somente o nutricionista pode editar o plano alimentar.';end if;
 if action not in ('save','publish','unpublish') then raise exception 'Operação inválida.';end if;
 if (payload->>'version')::integer is distinct from coalesce(w.version,0) then raise exception 'O plano mudou em outra sessão. Atualize antes de editar.';end if;
 if action='save' then
  perform fitto_private.validate_nutrition(payload->'content',false);
  if w.id is null then insert into fitto_private.nutrition_plans(link_id,draft) values(l.id,payload->'content') returning * into w;
  else update fitto_private.nutrition_plans set draft=payload->'content',version=version+1,updated_at=now() where id=w.id returning * into w;end if;
 else
  if w.id is null then raise exception 'Salve o plano antes de publicar.';end if;
  if action='publish' then
   perform fitto_private.validate_nutrition(w.draft,true);
   update fitto_private.nutrition_plans set published=draft,published_version=version+1,published_at=now(),version=version+1,updated_at=now() where id=w.id returning * into w;
  else update fitto_private.nutrition_plans set published=null,published_version=null,version=version+1,updated_at=now() where id=w.id returning * into w;end if;
 end if;
 return to_jsonb(w);
end $$;
revoke all on function fitto_private.nutrition_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function fitto_private.nutrition_api(text,uuid,uuid,jsonb) to authenticated;
create function public.nutrition_api(action text,profile_id uuid,link_id uuid,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select fitto_private.nutrition_api(action,profile_id,link_id,payload) $$;
revoke all on function public.nutrition_api(text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.nutrition_api(text,uuid,uuid,jsonb) to authenticated;
