import { Meal, nutritionKey } from './nutritionModel';
export type NutritionTools = { favorites: number[]; recent: number[]; templates: Meal[] };
export const emptyTools = (): NutritionTools => ({ favorites: [], recent: [], templates: [] });
export const copyMeal = (meal: Meal): Meal => ({
  ...meal,
  id: nutritionKey(),
  foods: meal.foods.map((food) => ({ ...food, id: nutritionKey() })),
});
export function recentFood(ids: number[], id: number) {
  return [id, ...ids.filter((value) => value !== id)].slice(0, 30);
}
export function scaleMeal(meal: Meal, factor: number): Meal {
  return {
    ...meal,
    foods: meal.foods.map((food) => {
      if (!food.tacoId || !food.grams) return food;
      const grams = Math.round(Number(food.grams.replace(',', '.')) * factor * 100) / 100;
      if (!Number.isFinite(grams) || grams < 0.01 || grams > 10000)
        throw new Error('O ajuste gera uma porção fora do limite de 0,01 a 10.000 g.');
      return { ...food, grams: String(grams), quantity: grams + ' g' };
    }),
  };
}
