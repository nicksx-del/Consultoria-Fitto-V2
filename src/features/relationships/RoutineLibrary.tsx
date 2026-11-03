import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, TextField } from '@/components/ui';
import {
  CatalogExercise,
  animatedCatalogId,
  equipmentLabels,
  exerciseName,
  imageUrl,
  loadCatalog,
  matchesExercise,
  muscleLabels,
  sortCatalog,
} from './exerciseCatalog';
import type { DraftExercise } from './workoutModel';

export function RoutineLibrary({
  exercises,
  profileId,
  disabled,
  onAdd,
  onCustom,
}: {
  exercises: DraftExercise[];
  profileId: string;
  disabled: boolean;
  onAdd: (item: CatalogExercise) => void;
  onCustom: () => void;
}) {
  const favoritesKey = `fitto-exercise-favorites-v1:${profileId}`;
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const value =
        Platform.OS === 'web' ? JSON.parse(localStorage.getItem(favoritesKey) || '[]') : [];
      return Array.isArray(value)
        ? value.filter((x) => typeof x === 'string').map(animatedCatalogId)
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const sync = () => {
      try {
        const value = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
        setFavorites(
          Array.isArray(value)
            ? value.filter((x) => typeof x === 'string').map(animatedCatalogId)
            : [],
        );
      } catch {}
    };
    window.addEventListener('fitto:exercise-favorites', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('fitto:exercise-favorites', sync);
      window.removeEventListener('storage', sync);
    };
  }, [favoritesKey]);

  const [favoritesOnly, setFavoritesOnly] = useState(false);
  function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(favoritesKey, JSON.stringify(next));
        window.dispatchEvent(new Event('fitto:exercise-favorites'));
      }
    } catch {}
  }
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query);
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [filters, setFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    void loadCatalog()
      .then((result) => {
        if (alive) setCatalog(sortCatalog(result.rows));
      })
      .catch(() => {
        if (alive) setError('Não foi possível carregar a biblioteca.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  const filtered = useMemo(
    () =>
      catalog.filter(
        (item) =>
          matchesExercise(item, search) &&
          (!favoritesOnly || favorites.includes(item.id)) &&
          (!muscle || item.primaryMuscles.includes(muscle)) &&
          (!equipment || item.equipment === equipment),
      ),
    [catalog, search, muscle, equipment, favorites, favoritesOnly],
  );
  const muscles = [...new Set(catalog.flatMap((item) => item.primaryMuscles))].sort();
  const equipmentOptions = [...new Set(catalog.map((item) => item.equipment))].sort();
  const full = disabled || exercises.length >= 40;
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          padding: 18,
          gap: 12,
          backgroundColor: '#202C19',
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#405631',
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '600' }}>Resumo da divisão</Text>
        <View style={{ flexDirection: 'row', gap: 28 }}>
          <View>
            <Text variant="title" color="#B7F34A">
              {exercises.length}
            </Text>
            <Text variant="caption">Exercícios</Text>
          </View>
          <View>
            <Text variant="title" color="#B7F34A">
              {exercises.reduce((sum, item) => sum + (Number(item.sets) || 0), 0)}
            </Text>
            <Text variant="caption">Séries</Text>
          </View>
        </View>
        <Text variant="caption">
          {[...new Set(exercises.map((item) => item.muscle).filter(Boolean))].join(' · ') ||
            'Adicione exercícios para começar.'}
        </Text>
      </View>
      <View
        style={{
          padding: 16,
          gap: 12,
          borderRadius: 18,
          backgroundColor: '#171F13',
          borderWidth: 1,
          borderColor: '#35462B',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Biblioteca de exercícios</Text>
        <Button
          title="+ Exercício personalizado"
          variant="ghost"
          disabled={full}
          onPress={onCustom}
        />
        <TextField
          label="Buscar exercícios"
          placeholder="Nome, músculo ou equipamento"
          value={query}
          onChangeText={setQuery}
        />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Button
            title="Todos"
            variant={!favoritesOnly ? 'primary' : 'outline'}
            onPress={() => setFavoritesOnly(false)}
          />
          <Button
            title="Favoritos"
            variant={favoritesOnly ? 'primary' : 'outline'}
            onPress={() => setFavoritesOnly(true)}
          />
        </View>
        <Button
          title={
            filters
              ? 'Recolher filtros'
              : `Filtrar por músculo e equipamento${muscle || equipment ? ' · ativo' : ''}`
          }
          variant="outline"
          onPress={() => setFilters(!filters)}
        />
        {filters ? (
          <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: 8 }}>
            <Text variant="caption">Músculo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['', ...muscles].map((value) => (
                <Button
                  key={value}
                  title={muscleLabels[value] || value || 'Todos'}
                  variant={muscle === value ? 'primary' : 'outline'}
                  onPress={() => setMuscle(value)}
                />
              ))}
            </View>
            <Text variant="caption">Equipamento</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['', ...equipmentOptions].map((value) => (
                <Button
                  key={value}
                  title={equipmentLabels[value] || value || 'Todos'}
                  variant={equipment === value ? 'primary' : 'outline'}
                  onPress={() => setEquipment(value)}
                />
              ))}
            </View>
          </ScrollView>
        ) : null}
        {notice ? (
          <Text variant="caption" color="#B7F34A" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color="#B7F34A" />
        ) : error ? (
          <>
            <Text accessibilityRole="alert">{error}</Text>
            <Button
              title="Tentar novamente"
              onPress={() => {
                setLoading(true);
                setError('');
                setAttempt((value) => value + 1);
              }}
            />
          </>
        ) : (
          <>
            <Text variant="caption">{filtered.length} exercícios encontrados</Text>
            <ScrollView
              style={{ height: 470 }}
              nestedScrollEnabled
              contentContainerStyle={{ gap: 4 }}
            >
              {filtered.map((item) => {
                const added = exercises.some(
                  (ex) =>
                    ex.catalog &&
                    animatedCatalogId(ex.catalog.id) === item.id &&
                    ex.catalog?.provider === (item.provider || 'free-exercise-db'),
                );
                return (
                  <View
                    key={`${item.provider}:${item.id}`}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Adicionar ${exerciseName(item)}`}
                      disabled={full}
                      onPress={() => {
                        onAdd(item);
                        setNotice(`${exerciseName(item)} adicionado.`);
                      }}
                      style={({ pressed }) => ({
                        flex: 1,
                        minWidth: 0,
                        flexDirection: 'row',
                        gap: 10,
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 6,
                        borderRadius: 10,
                        backgroundColor: pressed ? '#28391E' : 'transparent',
                        opacity: full ? 0.45 : 1,
                      })}
                    >
                      <Ionicons name="add-circle" size={25} color="#B7F34A" />
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          backgroundColor: '#EAEDE6',
                          borderRadius: 21,
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.images[0] ? (
                          <Image
                            source={{ uri: imageUrl(item.images[0]) || undefined }}
                            style={{ width: 42, height: 42 }}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons name="barbell-outline" size={23} color="#35462B" />
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ fontSize: 14 }}>{exerciseName(item)}</Text>
                        <Text variant="caption">
                          {muscleLabels[item.primaryMuscles[0]] || item.primaryMuscles[0]}
                          {added ? ' · na divisão' : ''}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${favorites.includes(item.id) ? 'Remover favorito' : 'Favoritar'} ${exerciseName(item)}`}
                      onPress={() => toggleFavorite(item.id)}
                      style={{
                        width: 36,
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={favorites.includes(item.id) ? 'star' : 'star-outline'}
                        size={20}
                        color={favorites.includes(item.id) ? '#C0F568' : '#9EAD92'}
                      />
                    </Pressable>
                  </View>
                );
              })}
              {!filtered.length ? (
                <Text variant="caption">
                  Nenhum exercício encontrado. Tente outro termo ou limpe os filtros.
                </Text>
              ) : null}
            </ScrollView>
          </>
        )}
        {exercises.length >= 40 ? (
          <Text variant="caption">Limite de 40 exercícios nesta divisão.</Text>
        ) : null}
      </View>
    </View>
  );
}
