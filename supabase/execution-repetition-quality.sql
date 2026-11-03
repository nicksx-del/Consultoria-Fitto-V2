create or replace function fitto_private.validate_set_log(doc jsonb,p jsonb,max_reps int) returns void language plpgsql security invoker set search_path='' as $$
declare s jsonb;expected int;pending boolean:=false;
begin
 if doc ? 'rep_quality' and doc->'rep_quality'<>'null'::jsonb and (jsonb_typeof(doc->'rep_quality') is distinct from 'string' or doc->>'rep_quality' not in ('good','fair','poor')) then raise exception 'Qualidade das repetições inválida.';end if;
 if doc ? 'actual_effort' then
 perform fitto_private.validate_effort(doc->'actual_effort');
 if doc->>'actual_effort' is not null and (doc->'actual_effort'->>'min')::numeric<>(doc->'actual_effort'->>'max')::numeric then raise exception 'Registre um único valor de esforço realizado.';end if;end if;
 if doc->>'seconds' is not null and (jsonb_typeof(doc->'seconds')<>'number' or (doc->>'seconds') !~ '^[0-9]+$' or (doc->>'seconds')::numeric not between 0 and 14400) then raise exception 'Duração inválida.';end if;
 if p ? 'technique' then
 expected:=jsonb_array_length(p->'technique'->'steps');
 if doc ? 'steps' then
 if jsonb_typeof(doc->'steps') is distinct from 'array' then raise exception 'Etapas inválidas.';end if;
 if jsonb_array_length(doc->'steps')<>expected then raise exception 'Etapas diferentes da prescrição.';end if;
 for s in select value from jsonb_array_elements(doc->'steps') loop
 if jsonb_typeof(s->'done') is distinct from 'boolean' then raise exception 'Estado da etapa inválido.';end if;
 if s->>'weight' is not null and (jsonb_typeof(s->'weight')<>'number' or (s->>'weight')::numeric not between 0 and 2000) then raise exception 'Carga da etapa inválida.';end if;
 if s->>'reps' is not null and (jsonb_typeof(s->'reps')<>'number' or (s->>'reps') !~ '^[0-9]+$' or (s->>'reps')::numeric not between 0 and max_reps) then raise exception 'Resultado da etapa inválido.';end if;
 if s->>'seconds' is not null and (jsonb_typeof(s->'seconds')<>'number' or (s->>'seconds') !~ '^[0-9]+$' or (s->>'seconds')::numeric not between 0 and 1800) then raise exception 'Tempo da etapa inválido.';end if;
 if (s->>'hold_until')::timestamptz>now()+interval '30 minutes' then raise exception 'Cronômetro inválido.';end if;
 if (s->>'done')::boolean then if pending then raise exception 'Conclua as etapas na ordem prescrita.';end if;else pending:=true;end if;
 end loop;
 if (doc->>'done')::boolean and pending then raise exception 'Conclua todas as etapas antes de concluir a série.';end if;
 elsif (doc->>'done')::boolean then raise exception 'Registre as etapas desta técnica.';end if;
 elsif doc ? 'steps' then raise exception 'Esta série não possui etapas prescritas.';end if;
end $$;
revoke all on function fitto_private.validate_set_log(jsonb,jsonb,int) from public,anon,authenticated;
