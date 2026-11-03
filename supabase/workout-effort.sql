create function fitto_private.validate_effort(value jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare lo numeric;hi numeric;mode text;
begin
 if value is null or value='null'::jsonb then return;end if;
 if jsonb_typeof(value) is distinct from 'object' or jsonb_typeof(value->'min') is distinct from 'number' or jsonb_typeof(value->'max') is distinct from 'number' then raise exception 'Meta de esforço inválida.';end if;
 mode:=value->>'mode';lo:=(value->>'min')::numeric;hi:=(value->>'max')::numeric;
 if mode is null or mode not in ('rir','rpe') or lo>hi or hi>10 or lo<(case when mode='rir' then 0 else 1 end) then raise exception 'Revise os limites de RIR/RPE.';end if;
 if (mode='rir' and (lo<>trunc(lo) or hi<>trunc(hi))) or (mode='rpe' and (lo*2<>trunc(lo*2) or hi*2<>trunc(hi*2))) then raise exception 'RIR aceita inteiros; RPE aceita incrementos de 0,5.';end if;
end $$;
revoke all on function fitto_private.validate_effort(jsonb) from public,anon,authenticated;
create or replace function fitto_private.validate_workout(doc jsonb,publishing boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb;e jsonb;v jsonb;k text;
begin
 perform fitto_private.validate_workout_base(doc,publishing);
 foreach k in array array['goal','starts','review'] loop
 if doc ? k and (jsonb_typeof(doc->k)<>'string' or char_length(doc->>k)>500) then raise exception 'Metadados da ficha inválidos.';end if;end loop;
 if coalesce(doc->>'starts','')<>'' then perform (doc->>'starts')::date;end if;
 if coalesce(doc->>'review','')<>'' then perform (doc->>'review')::date;end if;
 if coalesce(doc->>'starts','')<>'' and coalesce(doc->>'review','')<>'' and (doc->>'review')::date<(doc->>'starts')::date then raise exception 'Revisão anterior ao início.';end if;
 for s in select value from jsonb_array_elements(doc->'sessions') loop
 if s ? 'days' and (jsonb_typeof(s->'days')<>'string' or char_length(s->>'days')>100) then raise exception 'Dias inválidos.';end if;
 for e in select value from jsonb_array_elements(s->'exercises') loop
 perform fitto_private.validate_effort(e->'effort_target');
 foreach k in array array['muscle','load','effort','cadence','alternatives','method','group','video'] loop
 if e ? k and (jsonb_typeof(e->k)<>'string' or char_length(e->>k)>500) then raise exception 'Prescrição avançada inválida.';end if;end loop;
 if e ? 'metric' and coalesce(e->>'metric','') not in ('reps','seconds','meters') then raise exception 'Unidade inválida.';end if;
 if coalesce(e->>'video','')<>'' and (e->>'video') !~ '^https://[^[:space:]]+$' then raise exception 'Vídeo precisa de HTTPS.';end if;
 if e ? 'prescribed_sets' then
 if jsonb_typeof(e->'prescribed_sets')<>'array' then raise exception 'Séries individuais inválidas.';end if;
 if jsonb_array_length(e->'prescribed_sets')<>(e->>'sets')::int then raise exception 'Séries individuais diferentes do total.';end if;
 for v in select value from jsonb_array_elements(e->'prescribed_sets') loop
 perform fitto_private.validate_effort(v->'effort_target');
 if jsonb_typeof(v->'target') is distinct from 'string' or char_length(btrim(v->>'target')) not between 1 and 40 or jsonb_typeof(v->'load') is distinct from 'string' or char_length(v->>'load')>100 or coalesce(v->>'kind','') not in ('warmup','work') or coalesce(v->>'rest','') !~ '^[0-9]{1,4}$' then raise exception 'Preencha a prescrição de cada série.';end if;
 if (v->>'rest')::int>1800 then raise exception 'Descanso máximo de 1800s.';end if;
 end loop;end if;
 if publishing and coalesce(e->>'method','') in ('Supersérie','Bi-set') then
 if coalesce(btrim(e->>'group'),'')='' or (select count(*) from jsonb_array_elements(s->'exercises') x where x->>'group'=e->>'group' and x->>'method'=e->>'method')<2 then raise exception 'Agrupe pelo menos dois exercícios combinados.';end if;end if;
 end loop;end loop;
end $$;
