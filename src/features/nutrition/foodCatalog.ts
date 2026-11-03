import rows from './taco-foods.json';
import type { Food } from './nutritionModel';

export type CatalogFood = {
  id: number;
  name: string;
  category: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};
export const tacoFoods: CatalogFood[] = rows;
const byId = new Map(tacoFoods.map((food) => [food.id, food]));
export const normalizeFoodSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
export function searchFoods(query: string, category = '') {
  const words = normalizeFoodSearch(query).split(/\s+/).filter(Boolean);
  return tacoFoods.filter(
    (food) =>
      (!category || food.category === category) &&
      words.every((word) => normalizeFoodSearch(food.name).includes(word)),
  );
}
export function catalogFood(food: Food) {
  const row = food.tacoId ? byId.get(food.tacoId) : undefined;
  return row && row.name === food.name ? row : undefined;
}
export function foodNutrients(food: Food) {
  const row = catalogFood(food);
  const grams = Number((food.grams || '').replace(',', '.'));
  if (!row || !Number.isFinite(grams) || grams <= 0 || grams > 10000) return null;
  return Object.fromEntries(
    (['kcal', 'protein', 'carbs', 'fat'] as const).map((key) => [
      key,
      row[key] === null ? null : (row[key]! * grams) / 100,
    ]),
  ) as Pick<CatalogFood, 'kcal' | 'protein' | 'carbs' | 'fat'>;
}
export function nutrientTotals(foods: Food[]) {
  const values = foods.map(foodNutrients);
  return (['kcal', 'protein', 'carbs', 'fat'] as const).map((key) => ({
    key,
    value: values.reduce((sum, item) => sum + (item?.[key] ?? 0), 0),
    missing: values.filter((item) => item?.[key] == null).length,
  }));
}
export const nutrientLabels = {
  kcal: 'kcal',
  protein: 'Proteínas',
  carbs: 'Carboidratos',
  fat: 'Gorduras',
};
export const nutrientNumber = (value: number) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
