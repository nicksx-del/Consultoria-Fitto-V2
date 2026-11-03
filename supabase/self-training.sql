-- Keep separate student/professional profiles and all existing ownership checks.
do $migration$
declare definition text;
begin
 definition := pg_get_functiondef('fitto_private.relationship_api(text,jsonb)'::regprocedure);
 if definition not like '%if other.user_id=uid then%' then raise exception 'Unexpected relationship API version'; end if;
 definition := regexp_replace(definition, 'if other.user_id=uid then raise exception [^;]+; end if;', '', 'g');
 definition := replace(definition, '''name'',o.display_name', '''is_self'',o.user_id=p.user_id,''name'',o.display_name');
 definition := replace(definition,
 'if action=''approve'' and (select count(*) from fitto_private.links where professional_id=p.id and status=''active'')>=1 then',
 'if action=''approve'' and (select user_id from public.profiles where id=link.student_id)<>uid and (select count(*) from fitto_private.links existing join public.profiles student on student.id=existing.student_id where existing.professional_id=p.id and existing.status=''active'' and student.user_id<>uid)>=1 then');
 execute definition;
end $migration$;
