create or replace function fitto_private.validate_nutrition(doc jsonb,publishing boolean) returns void
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
   if food ? 'tacoId' then
    if jsonb_typeof(food->'tacoId') is distinct from 'number' or (food->>'tacoId') !~ '^[0-9]{1,3}$' then raise exception 'Alimento TACO inválido.'; end if;
    if (food->>'tacoId')::integer not between 1 and 597 then raise exception 'Alimento TACO inválido.'; end if;
    if jsonb_typeof(food->'grams') is distinct from 'string' or (food->>'grams') !~ '^[0-9]{1,5}([.,][0-9]{1,2})?$' then raise exception 'Quantidade em gramas inválida.'; end if;
    if replace(food->>'grams',',','.')::numeric <= 0 or replace(food->>'grams',',','.')::numeric > 10000 or food->>'quantity' is distinct from (food->>'grams') || ' g' then raise exception 'Revise a quantidade em gramas.'; end if;
   end if;
   if publishing and (btrim(food->>'name')='' or btrim(food->>'quantity')='') then raise exception 'Preencha alimento e quantidade antes de publicar.';end if;
  end loop;
 end loop;
end $$;
revoke all on function fitto_private.validate_nutrition(jsonb,boolean) from public,anon,authenticated;
