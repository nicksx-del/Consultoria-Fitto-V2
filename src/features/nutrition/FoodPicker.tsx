import { NutritionTools } from './nutritionTools';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Modal, View, Linking, Pressable, ScrollView } from 'react-native';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { CatalogFood, searchFoods, nutrientLabels, nutrientNumber } from './foodCatalog';

export function FoodPicker({
  onSelect,
  onClose,
  tools,
  onFavorite,
}: {
  tools?: NutritionTools;
  onFavorite?: (id: number) => Promise<void>;
  onSelect: (food: CatalogFood, grams: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogFood | null>(null);
  const [grams, setGrams] = useState('100');
  const [limit, setLimit] = useState(25);
  const [category, setCategory] = useState('');
  const categories = Array.from(new Set(searchFoods('').map((food) => food.category)));
  const [tab, setTab] = useState('all'),
    [toolBusy, setToolBusy] = useState(false),
    [toolError, setToolError] = useState('');
  const results = searchFoods(query, category)
    .filter(
      (food) =>
        tab === 'all' ||
        (tab === 'favorites' ? tools?.favorites : tools?.recent)?.includes(food.id),
    )
    .sort((a, b) =>
      tab === 'recent'
        ? (tools?.recent.indexOf(a.id) ?? 0) - (tools?.recent.indexOf(b.id) ?? 0)
        : 0,
    );
  function favorite(id: number) {
    setToolBusy(true);
    setToolError('');
    void onFavorite?.(id)
      .catch((e) => setToolError(e.message))
      .finally(() => setToolBusy(false));
  }

  const amount = Number(grams.replace(',', '.'));
  const valid = /^\d{1,5}([.,]\d{1,2})?$/.test(grams) && amount > 0 && amount <= 10000;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <Screen
        scrollable
        contentContainerStyle={{
          gap: 16,
          paddingVertical: 20,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <Button
          title={selected ? 'Voltar à busca' : 'Voltar à refeição'}
          variant="ghost"
          onPress={() => (selected ? setSelected(null) : onClose())}
        />
        <Text style={{ fontSize: 28, lineHeight: 35, fontWeight: '700', letterSpacing: -0.7 }}>
          {selected ? 'Definir porção' : 'Alimentos brasileiros'}
        </Text>
        {toolError ? (
          <Text accessibilityRole="alert" color="#FFB87A">
            {toolError}
          </Text>
        ) : null}
        {selected ? (
          <>
            <Text variant="title">{selected.name}</Text>
            {onFavorite ? (
              <Button
                title={
                  tools?.favorites.includes(selected.id)
                    ? '★ Remover dos favoritos'
                    : '☆ Favoritar alimento'
                }
                variant="outline"
                disabled={toolBusy}
                onPress={() => favorite(selected.id)}
              />
            ) : null}
            <Text variant="caption">
              {selected.category} · Confira o preparo: cru e cozido têm valores diferentes.
            </Text>
            <TextField
              label="Quantidade em gramas"
              value={grams}
              keyboardType="decimal-pad"
              maxLength={8}
              onChangeText={setGrams}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[50, 100, 150, 200].map((value) => (
                <Button
                  key={value}
                  title={value + ' g'}
                  variant={amount === value ? 'primary' : 'outline'}
                  onPress={() => setGrams(String(value))}
                />
              ))}
            </View>
            <View style={{ gap: 10, padding: 16, backgroundColor: '#26371E', borderRadius: 16 }}>
              <Text color="#C0F568">{valid ? 'Nesta porção' : 'Valores por 100 g'}</Text>
              {(['kcal', 'protein', 'carbs', 'fat'] as const).map((key) => (
                <Text key={key}>
                  {nutrientLabels[key]}:{' '}
                  {selected[key] === null
                    ? 'Não informado'
                    : nutrientNumber((selected[key]! * (valid ? amount : 100)) / 100) +
                      (key === 'kcal' ? ' kcal' : ' g')}
                </Text>
              ))}
            </View>
            {!valid ? (
              <Text color="#FFB87A">
                Informe entre 0,01 e 10.000 g, com até duas casas decimais.
              </Text>
            ) : null}
            <Button
              title="Adicionar à refeição"
              disabled={!valid || toolBusy}
              onPress={() => onSelect(selected, grams.replace(',', '.'))}
            />
            <Text variant="caption">
              Porção comestível em gramas. Não convertemos colher ou unidade sem uma medida
              confiável. Traços de nutrientes podem aparecer arredondados para zero.
            </Text>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[
                ['all', 'Todos'],
                ['favorites', 'Favoritos'],
                ['recent', 'Recentes'],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tab === value }}
                  onPress={() => {
                    setTab(value);
                    setLimit(25);
                  }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tab === value ? '#C0F568' : '#20281D',
                  }}
                >
                  <Text variant="caption" color={tab === value ? '#18200F' : '#CDD9C5'}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="Buscar alimento"
              placeholder="Ex.: arroz cozido, feijão, frango"
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                setLimit(25);
              }}
            />
            <ScrollView
              horizontal
              style={{ flexGrow: 0, height: 52 }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {['', ...categories].map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === item }}
                  onPress={() => {
                    setCategory(item);
                    setLimit(25);
                  }}
                  style={{
                    minHeight: 44,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    borderRadius: 22,
                    backgroundColor: category === item ? '#C0F568' : '#20281D',
                    borderWidth: 1,
                    borderColor: '#3A4932',
                  }}
                >
                  <Text variant="caption" color={category === item ? '#18200F' : '#CDD9C5'}>
                    {item || 'Todos'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text variant="caption">
              {results.length}{' '}
              {results.length === 1 ? 'alimento encontrado' : 'alimentos encontrados'} · TACO
            </Text>
            {results.slice(0, limit).map((food) => (
              <Pressable
                key={food.id}
                accessibilityRole="button"
                accessibilityLabel={'Selecionar ' + food.name}
                onPress={() => {
                  setSelected(food);
                  setGrams('100');
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: pressed ? '#303F25' : '#192218',
                  borderWidth: 1,
                  borderColor: '#303D2B',
                  minHeight: 80,
                })}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: '#2B3A21',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="leaf-outline" size={19} color="#C0F568" />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text>{food.name}</Text>
                  <Text variant="caption">{food.category}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color="#C0F568" />
              </Pressable>
            ))}
            {!results.length ? (
              <Text>
                Nenhum alimento encontrado. Tente outro termo ou cadastre manualmente na refeição.
              </Text>
            ) : null}
            {results.length > limit ? (
              <Button
                title="Mostrar mais alimentos"
                variant="outline"
                onPress={() => setLimit(limit + 25)}
              />
            ) : null}
          </>
        )}
        <Text variant="caption">Fonte: TACO · NEPA/UNICAMP, 4ª edição.</Text>
        <Button
          title="Consultar fonte dos dados"
          variant="ghost"
          onPress={() => void Linking.openURL('https://github.com/brolesi/taco')}
        />
      </Screen>
    </Modal>
  );
}
