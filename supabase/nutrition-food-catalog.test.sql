begin;
do $test$
declare
 d jsonb := '{"title":"Teste","goal":"","notes":"","restrictions":"","targets":{"kcal":"","protein":"","carbs":"","fat":""},"meals":[{"id":"m","name":"Almoço","time":"","notes":"","foods":[{"id":"f","name":"Arroz, integral, cozido","quantity":"150 g","substitution":"","tacoId":1,"grams":"150"}]}]}'::jsonb;
 bad jsonb; v text;
begin
 perform fitto_private.validate_nutrition(d,true);
 foreach v in array array['0','-1','10001','NaN','1 unidade',''] loop
  bad:=jsonb_set(d,'{meals,0,foods,0,grams}',to_jsonb(v));
  begin
   perform fitto_private.validate_nutrition(bad,true);
   raise exception 'TEST accepted invalid grams %',v;
  exception when raise_exception then
   if sqlerrm like 'TEST%' then raise;end if;
  end;
 end loop;
 bad:=jsonb_set(d,'{meals,0,foods,0,tacoId}','999'::jsonb);
 begin
  perform fitto_private.validate_nutrition(bad,false);
  raise exception 'TEST accepted unknown id';
 exception when raise_exception then if sqlerrm like 'TEST%' then raise;end if;end;
 bad:=jsonb_set(d,'{meals,0,foods,0,quantity}','"100 g"'::jsonb);
 begin
  perform fitto_private.validate_nutrition(bad,false);
  raise exception 'TEST accepted mismatched quantity';
 exception when raise_exception then if sqlerrm like 'TEST%' then raise;end if;end;
end $test$;
select 'PASS: TACO reference and quantity validation' result;
rollback;
