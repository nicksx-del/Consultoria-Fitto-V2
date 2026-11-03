create or replace function fitto_private.validate_workout_methods(doc jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb;e jsonb;p jsonb;t jsonb;b jsonb;g jsonb;cnt int;j int;
begin
 for s in select value from jsonb_array_elements(doc->'sessions') loop
 for e in select value from jsonb_array_elements(s->'exercises') loop
 if e ? 'group_rule' then
 g:=e->'group_rule';
 if jsonb_typeof(g) is distinct from 'object' or jsonb_typeof(g->'id') is distinct from 'string' or jsonb_typeof(g->'rounds') is distinct from 'number' or jsonb_typeof(g->'rest_seconds') is distinct from 'number' or coalesce(g->>'type','') not in ('superset','biset','circuit') or char_length(coalesce(g->>'id','')) not between 1 and 100 or coalesce(g->>'rounds','') !~ '^[0-9]{1,2}$' or coalesce(g->>'rest_seconds','') !~ '^[0-9]{1,4}$' then raise exception 'Agrupamento inválido.';end if;
 if (g->>'rounds')::int not between 1 and 20 or (g->>'rest_seconds')::int>1800 or (e->>'sets')::int<>(g->>'rounds')::int then raise exception 'Confira as voltas e o descanso do grupo.';end if;
 select count(*) into cnt from jsonb_array_elements(s->'exercises') x where x->'group_rule'->>'id'=g->>'id';
 if cnt<2 or (g->>'type'='biset' and cnt<>2) or exists(select 1 from jsonb_array_elements(s->'exercises') x where x->'group_rule'->>'id'=g->>'id' and (x->'group_rule'<>g or (x->>'sets')::int<>(g->>'rounds')::int)) then raise exception 'Grupo incompleto ou inconsistente.';end if;
 end if;
 if e ? 'prescribed_sets' then
 if jsonb_typeof(e->'prescribed_sets') is distinct from 'array' then raise exception 'Séries inválidas.';end if;
 for p in select value from jsonb_array_elements(e->'prescribed_sets') loop
 if p ? 'notes' and (jsonb_typeof(p->'notes') is distinct from 'string' or char_length(p->>'notes')>500) then raise exception 'Orientação da série: máximo 500 caracteres.';end if;
 if p ? 'technique' then
 t:=p->'technique';
 if jsonb_typeof(t) is distinct from 'object' or coalesce(t->>'type','') not in ('rest_pause','drop_set','cluster','isometric') or jsonb_typeof(t->'steps') is distinct from 'array' then raise exception 'Técnica inválida.';end if;
 cnt:=jsonb_array_length(t->'steps');
 if cnt>8 or cnt<(case when t->>'type'='isometric' then 1 else 2 end) then raise exception 'Confira a quantidade de etapas.';end if;
 j:=0;for b in select value from jsonb_array_elements(t->'steps') loop
 if jsonb_typeof(b->'target') is distinct from 'string' or char_length(btrim(b->>'target')) not between 1 and 40 or jsonb_typeof(b->'load') is distinct from 'string' or char_length(b->>'load')>100 or coalesce(b->>'rest','') !~ '^[0-9]{1,4}$' then raise exception 'Preencha alvo, carga orientada e pausa das etapas.';end if;
 if (b->>'rest')::int>1800 then raise exception 'Pausa máxima de 1800s.';end if;
 if t->>'type'='isometric' then
 if coalesce(b->>'seconds','') !~ '^[0-9]{1,4}$' then raise exception 'Informe o tempo de sustentação.';end if;
 if (b->>'seconds')::int not between 1 and 1800 then raise exception 'Sustentação: de 1 a 1800s.';end if;end if;
 if coalesce(b->>'reduction','')<>'' and (b->>'reduction') !~ '^[0-9]{1,2}$' then raise exception 'Redução percentual: de 0 a 99.';end if;
 if t->>'type'='drop_set' and j>0 and coalesce(b->>'reduction','')='' and btrim(b->>'load')='' then raise exception 'Prescreva a carga ou a redução de cada drop.';end if;
 j:=j+1;end loop;end if;end loop;end if;
 end loop;end loop;
end $$;
