import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TextField } from '@/components/ui';
import { DetailsPanel } from '@/features/relationships/DetailsPanel';
import { Food } from './nutritionModel';
import { NutrientSummary } from './NutrientSummary';

export function FoodEditorRow({
  food,
  busy,
  onChange,
  onRemove,
}: {
  food: Food;
  busy: boolean;
  onChange: (patch: Partial<Food>) => void;
  onRemove: () => void;
}) {
  return (
    <View style={{ gap: 4, paddingVertical: 7, borderBottomWidth: 1, borderColor: '#34422B' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {food.tacoId ? (
            <Text style={{ fontSize: 14, lineHeight: 19, fontWeight: '600' }}>{food.name}</Text>
          ) : (
            <TextField
              accessibilityLabel="Nome do alimento"
              placeholder="Nome do alimento"
              value={food.name}
              maxLength={300}
              editable={!busy}
              onChangeText={(name) => onChange({ name })}
            />
          )}
          {food.tacoId ? (
            <Text variant="caption" style={{ fontSize: 11 }}>
              Tabela TACO
            </Text>
          ) : null}
        </View>
        <View style={{ width: 78, gap: 2 }}>
          <Text variant="caption" style={{ fontSize: 11 }}>
            {food.tacoId ? 'Gramas' : 'Quantidade'}
          </Text>
          <TextInput
            accessibilityLabel={
              'Quantidade de ' + (food.name || 'alimento') + (food.tacoId ? ' em gramas' : '')
            }
            value={food.tacoId ? food.grams || '' : food.quantity}
            placeholder={food.tacoId ? '100' : '1 un.'}
            placeholderTextColor="#95A58A"
            keyboardType={food.tacoId ? 'decimal-pad' : 'default'}
            editable={!busy}
            maxLength={food.tacoId ? 8 : 300}
            onChangeText={(value) =>
              onChange(food.tacoId ? { grams: value, quantity: value + ' g' } : { quantity: value })
            }
            style={{
              height: 44,
              paddingHorizontal: 6,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#45543C',
              backgroundColor: '#11170E',
              color: '#F4F6F0',
              fontSize: 15,
            }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={'Remover ' + (food.name || 'alimento')}
          disabled={busy}
          onPress={onRemove}
          style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close-outline" size={22} color="#AABB9C" />
        </Pressable>
      </View>
      <NutrientSummary foods={[food]} compact />
      <DetailsPanel title={food.substitution ? 'Ver substituição' : 'Adicionar substituição'}>
        <TextField
          label="Substituto e quantidade"
          value={food.substitution}
          maxLength={300}
          editable={!busy}
          onChangeText={(substitution) => onChange({ substitution })}
        />
      </DetailsPanel>
    </View>
  );
}
