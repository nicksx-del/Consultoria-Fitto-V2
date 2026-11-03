create function fitto_private.validate_catalog_reference(c jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare p jsonb;ident text;
begin
 if jsonb_typeof(c) is distinct from 'object' or coalesce(c->>'provider','') not in ('free-exercise-db','exercisedb') or jsonb_typeof(c->'id') is distinct from 'string' or (c->>'id') !~ '^[A-Za-z0-9_.-]{1,160}$' or jsonb_typeof(c->'instructions') is distinct from 'string' or char_length(c->>'instructions')>3000 or jsonb_typeof(c->'images') is distinct from 'array' or jsonb_array_length(c->'images')>2 then raise exception 'Referência de exercício inválida.';end if;
 ident:=c->>'id';
 if c->>'provider'='exercisedb' and (ident !~ '^edb_[A-Za-z0-9_-]+$' or jsonb_array_length(c->'images')<>1) then raise exception 'GIF de exercício inválido.';end if;
 for p in select value from jsonb_array_elements(c->'images') loop
  if jsonb_typeof(p) is distinct from 'string' then raise exception 'Imagem inválida.';end if;
  if c->>'provider'='exercisedb' then
   if p#>>'{}' <> 'https://static.exercisedb.dev/media/'||substr(ident,5)||'.gif' then raise exception 'Origem do GIF não permitida.';end if;
  elsif left(p#>>'{}',char_length(ident)+1)<>ident||'/' or (p#>>'{}') !~ '^[A-Za-z0-9_.-]+/[0-9]+\.(jpg|png|webp)$' or position('..' in p#>>'{}')>0 then raise exception 'Origem da imagem não permitida.';end if;
 end loop;
end $$;
revoke all on function fitto_private.validate_catalog_reference(jsonb) from public,anon,authenticated;
alter function fitto_private.validate_workout(jsonb,boolean) rename to validate_workout_before_animated_catalog;
create function fitto_private.validate_workout(doc jsonb,publishing boolean) returns void language plpgsql security invoker set search_path='' as $$
declare s jsonb;e jsonb;a jsonb;
begin
 perform fitto_private.validate_workout_before_animated_catalog(doc,publishing);
 for s in select value from jsonb_array_elements(doc->'sessions') loop
  for e in select value from jsonb_array_elements(s->'exercises') loop
   if e ? 'catalog' then perform fitto_private.validate_catalog_reference(e->'catalog');end if;
   for a in select value from jsonb_array_elements(coalesce(e->'approved_alternatives','[]')) loop
    if a ? 'catalog' then perform fitto_private.validate_catalog_reference(a->'catalog');end if;
   end loop;
  end loop;
 end loop;
end $$;
revoke all on function fitto_private.validate_workout(jsonb,boolean) from public,anon,authenticated;
