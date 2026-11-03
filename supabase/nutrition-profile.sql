create function fitto_private.enable_nutrition(profile_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.';end if;
 select * into p from public.profiles where id=profile_id and user_id=auth.uid() and role='professional' for update;
 if p.id is null then raise exception 'Selecione seu perfil profissional.';end if;
 if not ('Nutricionista'=any(p.specialties)) then
  update public.profiles set specialties=array_append(specialties,'Nutricionista') where id=p.id returning * into p;
 end if;
 return to_jsonb(p);
end $$;
revoke all on function fitto_private.enable_nutrition(uuid) from public,anon;
grant execute on function fitto_private.enable_nutrition(uuid) to authenticated;
create function public.enable_nutrition(profile_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select fitto_private.enable_nutrition(profile_id) $$;
revoke all on function public.enable_nutrition(uuid) from public,anon;
grant execute on function public.enable_nutrition(uuid) to authenticated;
