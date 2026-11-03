import { NutrientSummary } from './NutrientSummary';
import React, { useState } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, TextField } from '@/components/ui';
import { DetailsPanel } from '@/features/relationships/DetailsPanel';
import { Meal, MealEntry, MealStatus, NutritionContent, mealStatusLabels } from './nutritionModel';

function MealCard({
  meal,
  index,
  entry,
  busy,
  readOnly,
  onLog,
}: {
  meal: Meal;
  index: number;
  entry?: MealEntry;
  busy: boolean;
  readOnly: boolean;
  onLog: (meal: Meal, status: MealStatus, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(entry?.note || '');
  const done = entry?.status === 'done';
  return (
    <View
      style={{
        padding: 18,
        gap: 16,
        borderRadius: 20,
        backgroundColor: done ? '#202E19' : '#161E13',
        borderWidth: 1,
        borderColor: done ? '#628440' : '#34472B',
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: '#304322',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={done ? 'checkmark' : 'restaurant-outline'} size={22} color="#C0F568" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 19, fontWeight: '600' }}>{meal.name}</Text>
          <Text variant="caption">
            {meal.time || `Refeição ${index + 1}`} · {mealStatusLabels[entry?.status || 'pending']}
          </Text>
        </View>
      </View>
      {meal.foods.map((food) => (
        <View
          key={food.id}
          style={{ gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderColor: '#304027' }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 23 }}>{food.name}</Text>
            <Text color="#C0F568" style={{ maxWidth: '45%', textAlign: 'right' }}>
              {food.quantity}
            </Text>
          </View>
          {food.substitution ? (
            <DetailsPanel title={`Substituição de ${food.name}`}>
              <Text variant="caption">{food.substitution}</Text>
            </DetailsPanel>
          ) : null}
        </View>
      ))}
      <NutrientSummary foods={meal.foods} title="Previsto nesta refeição" compact />
      {meal.notes ? (
        <View style={{ padding: 10, borderRadius: 10, backgroundColor: '#26341F' }}>
          <Text variant="caption">{meal.notes}</Text>
        </View>
      ) : null}
      {readOnly ? (
        entry?.note ? (
          <Text variant="caption">Relato do aluno: {entry.note}</Text>
        ) : null
      ) : (
        <>
          <Button
            title={done ? 'Desmarcar refeição' : 'Marcar refeição realizada'}
            variant={done ? 'outline' : 'primary'}
            disabled={busy}
            onPress={() => void onLog(meal, done ? 'pending' : 'done', note)}
          />
          <DetailsPanel title="Registro parcial, não realizada ou observação">
            <TextField
              label={`Observação sobre ${meal.name}`}
              placeholder="Conte o que mudou ou qual foi a dificuldade"
              value={note}
              maxLength={500}
              multiline
              editable={!busy}
              onChangeText={setNote}
            />
            <Button
              title="Registrar como parcial"
              variant="outline"
              disabled={busy}
              onPress={() => void onLog(meal, 'partial', note)}
            />
            <Button
              title="Registrar como não realizada"
              variant="outline"
              disabled={busy}
              onPress={() => void onLog(meal, 'skipped', note)}
            />
            <Button
              title="Salvar observação"
              variant="ghost"
              disabled={busy}
              onPress={() => void onLog(meal, entry?.status || 'pending', note)}
            />
          </DetailsPanel>
        </>
      )}
    </View>
  );
}
export function NutritionDayView({
  content,
  entries,
  day,
  busy = false,
  readOnly = false,
  onLog,
}: {
  content: NutritionContent;
  entries: MealEntry[];
  day: string;
  busy?: boolean;
  readOnly?: boolean;
  onLog: (meal: Meal, status: MealStatus, note: string) => Promise<void>;
}) {
  const today = entries.filter((e) => e.day === day),
    done = content.meals.filter((m) =>
      today.some((e) => e.meal_id === m.id && e.status === 'done'),
    ).length;
  const partial = content.meals.filter((m) =>
    today.some((e) => e.meal_id === m.id && e.status === 'partial'),
  ).length;
  const targets = (
    [
      { key: 'kcal', label: 'kcal/dia' },
      { key: 'protein', label: 'Proteínas · g' },
      { key: 'carbs', label: 'Carboidratos · g' },
      { key: 'fat', label: 'Gorduras · g' },
    ] as const
  ).filter((t) => content.targets[t.key]);
  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          padding: 20,
          gap: 12,
          borderRadius: 24,
          backgroundColor: '#27391D',
          borderWidth: 1,
          borderColor: '#4D6938',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name="leaf-outline" size={22} color="#C0F568" />
          <Text variant="caption" color="#C0F568">
            ALIMENTAÇÃO DO DIA
          </Text>
        </View>
        <Text style={{ fontSize: 28, lineHeight: 35, letterSpacing: -0.7, fontWeight: '700' }}>
          {content.title}
        </Text>
        {content.goal ? <Text variant="caption">{content.goal}</Text> : null}
        <Text>
          {done}/{content.meals.length} refeições realizadas
          {partial ? ` · ${partial} ${partial === 1 ? 'parcial' : 'parciais'}` : ''}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Refeições realizadas"
          accessibilityValue={{ min: 0, max: content.meals.length, now: done }}
          style={{ height: 6, borderRadius: 5, backgroundColor: '#455A36', overflow: 'hidden' }}
        >
          <View
            style={{
              height: 6,
              width: `${Math.round((done / content.meals.length) * 100)}%`,
              backgroundColor: '#C0F568',
            }}
          />
        </View>
        <Text variant="caption">
          {readOnly
            ? 'Registros enviados pelo aluno.'
            : 'Marque o que realizou. Você pode corrigir os registros depois.'}
        </Text>
      </View>
      <NutrientSummary
        foods={content.meals.flatMap((meal) => meal.foods)}
        title="Total previsto do plano"
      />
      {targets.length ? (
        <View style={{ gap: 8 }}>
          <Text variant="caption">METAS INFORMADAS PELO PROFISSIONAL</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {targets.map((t) => (
              <View
                key={t.key}
                style={{
                  width: '48%',
                  padding: 12,
                  gap: 4,
                  borderRadius: 14,
                  backgroundColor: '#1D2917',
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: '700' }}>{content.targets[t.key]}</Text>
                <Text variant="caption">{t.label}</Text>
              </View>
            ))}
          </View>
          <Text variant="caption">
            Metas do plano, sem cálculo de consumo a partir dos registros.
          </Text>
        </View>
      ) : null}
      {content.notes || content.restrictions ? (
        <DetailsPanel title="Orientações e restrições do plano">
          {content.restrictions ? (
            <Text>Restrições / preferências: {content.restrictions}</Text>
          ) : null}
          {content.notes ? <Text>{content.notes}</Text> : null}
        </DetailsPanel>
      ) : null}
      {content.meals.map((meal, index) => {
        const entry = today.find((e) => e.meal_id === meal.id);
        return (
          <MealCard
            key={`${meal.id}:${entry?.version || 0}`}
            meal={meal}
            index={index}
            entry={entry}
            busy={busy}
            readOnly={readOnly}
            onLog={onLog}
          />
        );
      })}
    </View>
  );
}
