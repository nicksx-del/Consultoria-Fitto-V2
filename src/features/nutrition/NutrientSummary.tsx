import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import type { Food } from './nutritionModel';
import { nutrientTotals, nutrientLabels, nutrientNumber } from './foodCatalog';

const colors = { kcal: '#C0F568', protein: '#9DC9FF', carbs: '#F2CB80', fat: '#D6B0F3' };
export function NutrientSummary({
  foods,
  title = 'Nutrientes previstos',
  compact = false,
}: {
  foods: Food[];
  title?: string;
  compact?: boolean;
}) {
  if (!foods.some((food) => food.tacoId)) return null;
  const totals = nutrientTotals(foods);
  if (compact)
    return (
      <View style={{ gap: 4 }}>
        <Text variant="caption" style={{ fontSize: 12, lineHeight: 18 }}>
          {title === 'Nutrientes previstos' ? '' : title + ' · '}
          {totals
            .map(
              (item) =>
                (item.missing ? '≥ ' : '') +
                nutrientNumber(item.value) +
                (item.key === 'kcal' ? ' kcal' : ' g ' + nutrientLabels[item.key].toLowerCase()),
            )
            .join(' · ')}
        </Text>
        {totals.some((item) => item.missing) ? (
          <Text variant="caption" color="#F2CB80" style={{ fontSize: 11 }}>
            Total parcial · dados incompletos
          </Text>
        ) : null}
      </View>
    );
  return (
    <View
      style={{
        gap: 12,
        padding: compact ? 10 : 16,
        borderRadius: 20,
        backgroundColor: '#192218',
        borderWidth: 1,
        borderColor: '#303D2B',
      }}
    >
      <Text variant="caption" color="#CDD9C5">
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {totals.map((item) => (
          <View
            key={item.key}
            style={{
              flexBasis: compact ? '45%' : '45%',
              flexGrow: 1,
              gap: 5,
              padding: compact ? 4 : 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors[item.key] }}
              />
              <Text variant="caption">
                {item.key === 'kcal' ? 'Energia' : nutrientLabels[item.key]}
              </Text>
            </View>
            <Text
              style={{
                fontSize: compact ? 16 : 23,
                lineHeight: compact ? 24 : 30,
                fontWeight: '700',
              }}
              color={colors[item.key]}
            >
              {item.missing ? '≥ ' : ''}
              {nutrientNumber(item.value)}
              <Text variant="caption"> {item.key === 'kcal' ? 'kcal' : 'g'}</Text>
            </Text>
          </View>
        ))}
      </View>
      {totals.some((item) => item.missing) ? (
        <Text variant="caption" color="#F2CB80">
          Total parcial · há alimentos sem dados completos.
        </Text>
      ) : null}
      {!compact ? (
        <Text variant="caption">
          Estimativa do plano · TACO/UNICAMP. Não representa o consumo registrado.
        </Text>
      ) : null}
    </View>
  );
}
