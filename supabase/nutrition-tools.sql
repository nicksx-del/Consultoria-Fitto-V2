create table fitto_private.nutrition_toolbox (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 content jsonb not null default '{"favorites":[],"recent":[],"templates":[]}',
 version integer not null default 1
);
alter table fitto_private.nutrition_toolbox enable row level security;
revoke all on fitto_private.nutrition_toolbox from public,anon,authenticated;

create function fitto_private.nutrition_tools(profile_id uuid,action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; t fitto_private.nutrition_toolbox; item jsonb; field text; doc jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.';end if;
 select * into p from public.profiles where id=profile_id and user_id=auth.uid() for update;
 if p.id is null or p.role<>'professional' or not coalesce('Nutricionista'=any(p.specialties),false) then raise exception 'Perfil não autorizado.';end if;
 if action='plans' then
  return coalesce((select jsonb_agg(to_jsonb(q)) from
   (select n.id,n.draft->>'title' as title,n.draft->'meals' as meals
    from fitto_private.nutrition_plans n join fitto_private.links l on l.id=n.link_id
    where l.professional_id=p.id and l.status='active' order by n.updated_at desc limit 100) q),'[]');
 end if;
 select * into t from fitto_private.nutrition_toolbox where nutrition_toolbox.profile_id=p.id for update;
 if action='read' then return jsonb_build_object('content',coalesce(t.content,'{"favorites":[],"recent":[],"templates":[]}'),'version',coalesce(t.version,0));end if;
 if action<>'save' then raise exception 'Operação inválida.';end if;
 if (payload->>'version')::integer is distinct from coalesce(t.version,0) then raise exception 'Os atalhos mudaram em outra sessão. Reabra o editor.';end if;
 doc:=payload->'content';
 if jsonb_typeof(doc) is distinct from 'object' or octet_length(doc::text)>200000 then raise exception 'Atalhos inválidos.';end if;
 foreach field in array array['favorites','recent'] loop
  if jsonb_typeof(doc->field) is distinct from 'array' then raise exception 'Lista inválida.';end if;
  if jsonb_array_length(doc->field)>(case when field='recent' then 30 else 597 end) then raise exception 'Lista muito extensa.';end if;
  for item in select value from jsonb_array_elements(doc->field) loop
   if jsonb_typeof(item) is distinct from 'number' or item::text !~ '^[0-9]{1,3}$' then raise exception 'Alimento inválido.';end if;
   if item::text::integer not between 1 and 597 then raise exception 'Alimento inválido.';end if;
  end loop;
 end loop;
 if jsonb_typeof(doc->'templates') is distinct from 'array' then raise exception 'Modelos inválidos.';end if;
 if jsonb_array_length(doc->'templates')>20 then raise exception 'Limite de 20 modelos.';end if;
 for item in select value from jsonb_array_elements(doc->'templates') loop
  perform fitto_private.validate_nutrition(jsonb_build_object('title','Modelo','goal','','notes','','restrictions','','targets','{"kcal":"","protein":"","carbs":"","fat":""}'::jsonb,'meals',jsonb_build_array(item)),true);
 end loop;
 if t.profile_id is null then insert into fitto_private.nutrition_toolbox(profile_id,content) values(p.id,doc) returning * into t;
 else update fitto_private.nutrition_toolbox set content=doc,version=version+1 where nutrition_toolbox.profile_id=p.id returning * into t;end if;
 return jsonb_build_object('content',t.content,'version',t.version);
end $$;
revoke all on function fitto_private.nutrition_tools(uuid,text,jsonb) from public,anon;
grant execute on function fitto_private.nutrition_tools(uuid,text,jsonb) to authenticated;
create function public.nutrition_tools(profile_id uuid,action text,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select fitto_private.nutrition_tools(profile_id,action,payload) $$;
revoke all on function public.nutrition_tools(uuid,text,jsonb) from public,anon;
grant execute on function public.nutrition_tools(uuid,text,jsonb) to authenticated;
