import { copyMeal, recentFood, scaleMeal } from './nutritionTools';
import { useNutritionTools } from './useNutritionTools';
import { MealLibrary } from './MealLibrary';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FoodPicker } from './FoodPicker';
import { NutrientSummary } from './NutrientSummary';
import { FoodEditorRow } from './FoodEditorRow';
import React, { useState } from 'react';
import { Modal, View, Pressable } from 'react-native';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { DetailsPanel } from '@/features/relationships/DetailsPanel';
import { NutritionContent, Meal, emptyMeal, emptyFood, nutritionProblems } from './nutritionModel';

export function NutritionEditor({
  initial,
  profileId,
  busy,
  onSave,
  onClose,
}: {
  profileId?: string;
  initial: NutritionContent;
  busy: boolean;
  onSave: (doc: NutritionContent, publish: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const toolbox = useNutritionTools(profileId);
  const [library, setLibrary] = useState(false),
    [toolNotice, setToolNotice] = useState('');
  const [expandedMeal, setExpandedMeal] = useState(initial.meals[0]?.id || '');
  const [pickerMeal, setPickerMeal] = useState<string | null>(null);
  const [doc, setDoc] = useState<NutritionContent>(() => JSON.parse(JSON.stringify(initial))),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false),
    [confirmExit, setConfirmExit] = useState(false),
    [review, setReview] = useState(false),
    [saved, setSaved] = useState(false);
  function edit(patch: Partial<NutritionContent>) {
    setDoc((d) => ({ ...d, ...patch }));
    setDirty(true);
    setSaved(false);
    setReview(false);
  }
  function patchMeal(id: string, patch: Partial<Meal>) {
    edit({ meals: doc.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }
  function addCopy(meal: Meal) {
    if (doc.meals.length >= 10) {
      setError('Limite de 10 refeições.');
      return;
    }
    const copy = copyMeal(meal);
    edit({ meals: [...doc.meals, copy] });
    setExpandedMeal(copy.id);
    setLibrary(false);
  }
  async function saveTemplate(meal: Meal) {
    const issues = nutritionProblems({ ...doc, meals: [meal] }, true);
    if (issues.length) {
      setError(issues.join('\n'));
      return;
    }
    try {
      if (toolbox.content.templates.length >= 20)
        throw new Error('Limite de 20 modelos. Exclua um para continuar.');
      await toolbox.update((value) => ({
        ...value,
        templates: [...value.templates, copyMeal(meal)],
      }));
      setToolNotice('Modelo salvo nos seus atalhos.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function close() {
    if (dirty) setConfirmExit(true);
    else onClose();
  }
  async function save(publish: boolean) {
    const issues = nutritionProblems(doc, publish);
    if (issues.length) {
      setError(issues.join('\n'));
      return;
    }
    setError('');
    try {
      await onSave(doc, publish);
      setDirty(false);
      setSaved(true);
      if (publish) onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Modal
        visible
        animationType="slide"
        onRequestClose={() => {
          if (!busy) close();
        }}
      >
        <Screen
          scrollable
          contentContainerStyle={{
            gap: 12,
            paddingVertical: 20,
            maxWidth: 720,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <Button
            title="Voltar ao plano alimentar"
            variant="ghost"
            disabled={busy}
            onPress={close}
          />
          <Text style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Plano alimentar</Text>
          <Text variant="caption">Adicione as refeições. Revise e publique para o aluno.</Text>
          {confirmExit ? (
            <View style={{ gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#382C19' }}>
              <Text>Há alterações não salvas.</Text>
              <Button
                title="Continuar editando"
                disabled={busy}
                onPress={() => setConfirmExit(false)}
              />
              <Button title="Sair sem salvar" variant="outline" disabled={busy} onPress={onClose} />
            </View>
          ) : null}
          <TextField
            label="Nome do plano"
            value={doc.title}
            maxLength={100}
            editable={!busy}
            onChangeText={(title) => edit({ title })}
          />
          <DetailsPanel title="Objetivo, metas e orientações">
            <TextField
              label="Objetivo / foco do acompanhamento"
              value={doc.goal}
              maxLength={1000}
              editable={!busy}
              onChangeText={(goal) => edit({ goal })}
            />
            <Text variant="caption">
              Metas opcionais informadas por você. Não há cálculo automático de necessidades
              nutricionais. Os alimentos da tabela têm nutrientes calculados pela porção.
            </Text>
            {(
              [
                { field: 'kcal', label: 'Energia (kcal/dia)' },
                { field: 'protein', label: 'Proteínas (g/dia)' },
                { field: 'carbs', label: 'Carboidratos (g/dia)' },
                { field: 'fat', label: 'Gorduras (g/dia)' },
              ] as const
            ).map((item) => (
              <TextField
                key={item.field}
                label={item.label}
                value={doc.targets[item.field]}
                maxLength={8}
                keyboardType="decimal-pad"
                editable={!busy}
                onChangeText={(value) => edit({ targets: { ...doc.targets, [item.field]: value } })}
              />
            ))}
            <TextField
              label="Restrições e preferências consideradas"
              value={doc.restrictions}
              maxLength={1000}
              multiline
              editable={!busy}
              onChangeText={(restrictions) => edit({ restrictions })}
            />
            <TextField
              label="Orientações gerais"
              value={doc.notes}
              maxLength={1000}
              multiline
              editable={!busy}
              onChangeText={(notes) => edit({ notes })}
            />
          </DetailsPanel>
          <NutrientSummary
            foods={doc.meals.flatMap((meal) => meal.foods)}
            title="Total do plano"
            compact
          />
          {toolbox.error ? (
            <Text accessibilityRole="alert" color="#FFB87A">
              {toolbox.error}
            </Text>
          ) : null}
          {toolNotice ? (
            <Text accessibilityLiveRegion="polite" color="#C0F568">
              {toolNotice}
            </Text>
          ) : null}
          <Button
            title="Usar modelo ou copiar refeição"
            variant="outline"
            disabled={busy || toolbox.busy || !toolbox.ready || doc.meals.length >= 10}
            onPress={() => setLibrary(true)}
          />
          <Text variant="title">Refeições · {doc.meals.length}/10</Text>
          {doc.meals.map((meal, index) => (
            <View
              key={meal.id}
              style={{
                padding: 12,
                gap: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#3D5130',
                backgroundColor: '#1A2515',
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={'Editar ' + meal.name}
                accessibilityState={{ expanded: expandedMeal === meal.id }}
                onPress={() => setExpandedMeal(expandedMeal === meal.id ? '' : meal.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#304322',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text color="#C0F568">{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>{meal.name}</Text>
                  <Text variant="caption">
                    {meal.time || 'Sem horário'} · {meal.foods.filter((f) => f.name.trim()).length}{' '}
                    {meal.foods.filter((f) => f.name.trim()).length === 1
                      ? 'alimento'
                      : 'alimentos'}
                  </Text>
                </View>
                <Ionicons
                  name={expandedMeal === meal.id ? 'chevron-up' : 'chevron-down'}
                  color="#C0F568"
                  size={20}
                />
              </Pressable>
              {expandedMeal === meal.id ? (
                <>
                  {meal.foods.map((food) => (
                    <FoodEditorRow
                      key={food.id}
                      food={food}
                      busy={busy}
                      onChange={(patch) =>
                        patchMeal(meal.id, {
                          foods: meal.foods.map((f) => (f.id === food.id ? { ...f, ...patch } : f)),
                        })
                      }
                      onRemove={() =>
                        patchMeal(meal.id, { foods: meal.foods.filter((f) => f.id !== food.id) })
                      }
                    />
                  ))}
                  {meal.foods.length > 1 ? (
                    <NutrientSummary foods={meal.foods} title="Total da refeição" compact />
                  ) : null}
                  <Button
                    title="+ Adicionar alimento"
                    disabled={busy || meal.foods.length >= 30}
                    onPress={() => setPickerMeal(meal.id)}
                  />
                  <Button
                    title="Cadastrar manualmente"
                    variant="outline"
                    disabled={busy || meal.foods.length >= 30}
                    onPress={() => patchMeal(meal.id, { foods: [...meal.foods, emptyFood()] })}
                  />
                  <DetailsPanel title="Nome, horário e opções">
                    <TextField
                      label="Nome da refeição"
                      value={meal.name}
                      maxLength={80}
                      editable={!busy}
                      onChangeText={(name) => patchMeal(meal.id, { name })}
                    />
                    <TextField
                      label="Horário (opcional)"
                      placeholder="08:00"
                      value={meal.time}
                      maxLength={5}
                      editable={!busy}
                      onChangeText={(time) => patchMeal(meal.id, { time })}
                    />
                    <TextField
                      label="Orientações desta refeição"
                      value={meal.notes}
                      maxLength={500}
                      multiline
                      editable={!busy}
                      onChangeText={(notes) => patchMeal(meal.id, { notes })}
                    />
                    <Button
                      title="Duplicar refeição"
                      variant="outline"
                      disabled={busy || doc.meals.length >= 10}
                      onPress={() =>
                        addCopy({ ...meal, name: (meal.name + ' (cópia)').slice(0, 80) })
                      }
                    />
                    <Button
                      title="Salvar como modelo"
                      variant="outline"
                      disabled={busy || toolbox.busy || !toolbox.ready}
                      onPress={() => void saveTemplate(meal)}
                    />
                    <Text variant="caption">
                      Ajustar porções em gramas. Quantidades manuais não mudam.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        [0.9, '−10%'],
                        [1.1, '+10%'],
                        [1.25, '+25%'],
                      ].map(([factor, label]) => (
                        <Button
                          key={String(label)}
                          title={String(label)}
                          variant="outline"
                          disabled={busy || !meal.foods.some((f) => f.tacoId)}
                          onPress={() => {
                            try {
                              patchMeal(meal.id, scaleMeal(meal, Number(factor)));
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        />
                      ))}
                    </View>
                    <Button
                      title="Mover para cima"
                      variant="outline"
                      disabled={busy || index === 0}
                      onPress={() => {
                        const meals = [...doc.meals];
                        [meals[index - 1], meals[index]] = [meals[index], meals[index - 1]];
                        edit({ meals });
                      }}
                    />
                    <Button
                      title="Remover refeição"
                      variant="ghost"
                      disabled={busy || doc.meals.length <= 1}
                      onPress={() => edit({ meals: doc.meals.filter((m) => m.id !== meal.id) })}
                    />
                  </DetailsPanel>
                </>
              ) : null}
            </View>
          ))}
          <Button
            title="Adicionar refeição"
            variant="outline"
            disabled={busy || doc.meals.length >= 10}
            onPress={() => {
              const meal = emptyMeal();
              edit({ meals: [...doc.meals, meal] });
              setExpandedMeal(meal.id);
            }}
          />
          {error ? (
            <Text accessibilityRole="alert" color="#FFB87A">
              {error}
            </Text>
          ) : null}
          {saved ? (
            <Text accessibilityLiveRegion="polite" color="#C0F568">
              Rascunho salvo. Você pode continuar editando ou publicar.
            </Text>
          ) : null}
          <Button title="Salvar rascunho" loading={busy} onPress={() => void save(false)} />
          <Button
            title="Revisar para publicar"
            variant="outline"
            disabled={busy}
            onPress={() => {
              const issues = nutritionProblems(doc, true);
              setError(issues.join('\n'));
              setReview(!issues.length);
            }}
          />
          {review ? (
            <View style={{ padding: 16, gap: 12, borderRadius: 18, backgroundColor: '#28391D' }}>
              <Text variant="title">{doc.title}</Text>
              <Text>
                {doc.meals.length} refeições · {doc.meals.reduce((n, m) => n + m.foods.length, 0)}{' '}
                alimentos
              </Text>
              <Text variant="caption">
                A publicação substitui a versão visível ao aluno. Registros anteriores permanecem no
                histórico.
              </Text>
              <Button
                title="Publicar plano para o aluno"
                loading={busy}
                onPress={() => void save(true)}
              />
            </View>
          ) : null}
        </Screen>
      </Modal>
      {library ? (
        <MealLibrary
          templates={toolbox.content.templates}
          profileId={profileId}
          onClose={() => setLibrary(false)}
          onUse={addCopy}
          onRemove={async (id) => {
            await toolbox.update((value) => ({
              ...value,
              templates: value.templates.filter((meal) => meal.id !== id),
            }));
          }}
        />
      ) : null}
      {pickerMeal ? (
        <FoodPicker
          tools={toolbox.content}
          onFavorite={
            toolbox.ready
              ? async (id) => {
                  await toolbox.update((value) => ({
                    ...value,
                    favorites: value.favorites.includes(id)
                      ? value.favorites.filter((item) => item !== id)
                      : [...value.favorites, id],
                  }));
                }
              : undefined
          }
          onClose={() => setPickerMeal(null)}
          onSelect={(food, grams) => {
            const meal = doc.meals.find((item) => item.id === pickerMeal);
            if (meal && meal.foods.length < 30)
              patchMeal(meal.id, {
                foods: [
                  ...meal.foods.filter(
                    (item) => item.name.trim() || item.quantity.trim() || item.substitution.trim(),
                  ),
                  {
                    ...emptyFood(),
                    name: food.name,
                    tacoId: food.id,
                    grams,
                    quantity: grams + ' g',
                  },
                ],
              });
            setPickerMeal(null);
            if (toolbox.ready && !toolbox.busy)
              void toolbox
                .update((value) => ({ ...value, recent: recentFood(value.recent, food.id) }))
                .catch(() => {});
          }}
        />
      ) : null}
    </>
  );
}
