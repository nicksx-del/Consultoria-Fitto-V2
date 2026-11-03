const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
function moduleTs(file,requireFn){const obj={};new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(obj,requireFn);return obj;}
const model=moduleTs('src/features/nutrition/nutritionModel.ts',()=>{});
const api=moduleTs('src/features/nutrition/nutritionTools.ts',()=>model);
const meal=model.emptyMeal();meal.foods=[{id:'a',name:'Arroz',tacoId:1,grams:'200',quantity:'200 g',substitution:''},{id:'b',name:'Manual',quantity:'1 unidade',substitution:''}];
const copy=api.copyMeal(meal);assert.notEqual(copy.id,meal.id);assert.notEqual(copy.foods[0].id,meal.foods[0].id);copy.foods[0].name='Novo';assert.equal(meal.foods[0].name,'Arroz');
assert.equal(api.scaleMeal(meal,1.1).foods[0].grams,'220');assert.equal(api.scaleMeal(meal,0.9).foods[1].quantity,'1 unidade');
assert.throws(()=>api.scaleMeal({...meal,foods:[{...meal.foods[0],grams:'10000'}]},1.25));
assert.deepEqual(api.recentFood([1,3,2],3),[3,1,2]);assert.equal(api.recentFood(Array.from({length:30},(_,i)=>i+1),99).length,30);
assert.equal(model.nutritionProblems({...model.emptyNutrition(),meals:[copy]},true).length,0);
console.log('PASS: independent meal and food copies, safe scaling, manual portions preserved, unique recents capped at 30.');
