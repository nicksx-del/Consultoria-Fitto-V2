import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { Button, Screen, Text } from '@/components/ui';
import { Meal } from './nutritionModel';
import { NutritionTools } from './nutritionTools';
import { toolsApi } from './useNutritionTools';
export function MealLibrary({
  templates,
  profileId,
  onUse,
  onRemove,
  onClose,
}: {
  templates: NutritionTools['templates'];
  profileId?: string;
  onUse: (meal: Meal) => void;
  onRemove: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [plans, setPlans] = useState<{ id: string; title: string; meals: Meal[] }[] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
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
        <Button title="Voltar ao plano" variant="ghost" onPress={onClose} disabled={busy} />
        <Text variant="title">Reaproveitar refeição</Text>
        <Text variant="caption">
          Adiciona uma cópia ao rascunho. Revise as porções e restrições antes de publicar.
        </Text>
        <Text>Meus modelos · {templates.length}/20</Text>
        {!templates.length ? (
          <Text variant="caption">
            Salve uma refeição em “Nome, horário e opções” para reutilizar aqui.
          </Text>
        ) : null}
        {templates.map((meal) => (
          <View
            key={meal.id}
            style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#202D19' }}
          >
            <Text>
              {meal.name} · {meal.foods.length} alimentos
            </Text>
            <Button
              title={'Usar modelo ' + meal.name}
              disabled={busy}
              onPress={() => onUse(meal)}
            />
            <Button
              title={'Excluir modelo ' + meal.name}
              variant="ghost"
              disabled={busy}
              onPress={() => {
                setBusy(true);
                void onRemove(meal.id)
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            />
          </View>
        ))}
        <Button
          title="Copiar de outro plano"
          variant="outline"
          disabled={busy || !profileId}
          onPress={() => {
            setBusy(true);
            setError('');
            void toolsApi<{ id: string; title: string; meals: Meal[] }[]>(profileId!, 'plans')
              .then(setPlans)
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        />
        {plans?.length === 0 ? (
          <Text variant="caption">Nenhum plano encontrado em seus acompanhamentos ativos.</Text>
        ) : null}
        {plans?.map((plan) => (
          <View
            key={plan.id}
            style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#202D19' }}
          >
            <Text>{plan.title}</Text>
            {plan.meals.map((meal) => (
              <Button
                key={meal.id}
                title={'Copiar ' + meal.name}
                variant="outline"
                disabled={busy}
                onPress={() => onUse(meal)}
              />
            ))}
          </View>
        ))}
        {busy ? <Text variant="caption">Carregando…</Text> : null}
        {error ? (
          <Text color="#FFB87A" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </Screen>
    </Modal>
  );
}
