export type Food = {
  id: string;
  name: string;
  quantity: string;
  substitution: string;
  tacoId?: number;
  grams?: string;
};
export type Meal = { id: string; name: string; time: string; notes: string; foods: Food[] };
export type NutritionContent = {
  title: string;
  goal: string;
  notes: string;
  restrictions: string;
  targets: { kcal: string; protein: string; carbs: string; fat: string };
  meals: Meal[];
};
export type NutritionPlan = {
  id: string;
  draft?: NutritionContent;
  published: NutritionContent | null;
  version?: number;
  published_version: number | null;
  published_at: string | null;
};
export type MealStatus = 'done' | 'partial' | 'skipped' | 'pending';
export type MealEntry = {
  id: string;
  meal_id: string;
  plan_version: number;
  day: string;
  status: MealStatus;
  note: string;
  version: number;
  meal_snapshot: Meal;
  updated_at: string;
};
export type NutritionData = { plan: NutritionPlan | null; entries: MealEntry[] };
export const mealStatusLabels: Record<MealStatus, string> = {
  done: 'Realizada',
  partial: 'Parcial',
  skipped: 'Não realizada',
  pending: 'Sem registro',
};
export const nutritionKey = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
export const emptyFood = (): Food => ({
  id: nutritionKey(),
  name: '',
  quantity: '',
  substitution: '',
});
export const emptyMeal = (name = 'Nova refeição'): Meal => ({
  id: nutritionKey(),
  name,
  time: '',
  notes: '',
  foods: [emptyFood()],
});
export function emptyNutrition(): NutritionContent {
  return {
    title: 'Plano alimentar',
    goal: '',
    notes: '',
    restrictions: '',
    targets: { kcal: '', protein: '', carbs: '', fat: '' },
    meals: ['Café da manhã', 'Almoço', 'Jantar'].map((name) => emptyMeal(name)),
  };
}
export function nutritionDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function recentMealEntries(entries: MealEntry[], day: string) {
  const start = new Date(day + 'T12:00:00');
  start.setDate(start.getDate() - 6);
  const earliest = nutritionDay(start);
  return entries.filter(
    (e) => e.day >= earliest && e.day <= day && (e.status !== 'pending' || !!e.note),
  );
}
export function nutritionProblems(doc: NutritionContent, publishing: boolean) {
  const errors: string[] = [];
  if (doc.title.trim().length < 2 || doc.title.length > 100)
    errors.push('Informe um nome de plano entre 2 e 100 caracteres.');
  if (doc.meals.length < 1 || doc.meals.length > 10) errors.push('Crie de 1 a 10 refeições.');
  for (const [i, meal] of doc.meals.entries()) {
    if (!meal.name.trim() || meal.name.length > 80)
      errors.push(`Refeição ${i + 1}: informe um nome de até 80 caracteres.`);
    if (meal.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time))
      errors.push(`${meal.name}: use horário HH:MM ou deixe em branco.`);
    if (meal.foods.length > 30 || (publishing && !meal.foods.length))
      errors.push(`${meal.name}: adicione de 1 a 30 alimentos antes de publicar.`);
    if (
      meal.foods.some(
        (f) =>
          f.tacoId !== undefined &&
          (!Number.isInteger(f.tacoId) ||
            f.tacoId < 1 ||
            f.tacoId > 597 ||
            !/^\d{1,5}([.,]\d{1,2})?$/.test(f.grams || '') ||
            Number((f.grams || '').replace(',', '.')) <= 0 ||
            Number((f.grams || '').replace(',', '.')) > 10000 ||
            f.quantity !== f.grams + ' g'),
      )
    )
      errors.push(meal.name + ': revise a quantidade em gramas do alimento da tabela.');
    if (publishing && meal.foods.some((f) => !f.name.trim() || !f.quantity.trim()))
      errors.push(`${meal.name}: preencha o nome e a quantidade de cada alimento.`);
  }
  for (const value of Object.values(doc.targets))
    if (value && !/^\d{1,5}([.,]\d{1,2})?$/.test(value)) {
      errors.push('Informe metas numéricas ou deixe os campos em branco.');
      break;
    }
  return errors;
}
