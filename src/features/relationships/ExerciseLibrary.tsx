import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import {
  CATALOG_SOURCE,
  animatedCatalogId,
  CatalogExercise,
  equipmentLabels,
  exerciseName,
  imageUrl,
  loadCatalog,
  matchesExercise,
  muscleLabels,
  sortCatalog,
} from './exerciseCatalog';
import { CatalogImage } from './ExerciseDemonstration';
const accent = '#B7F34A';
function IconButton({
  name,
  label,
  onPress,
  active = false,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={name} size={23} color={active ? accent : '#ADB7A5'} />
    </Pressable>
  );
}
function Thumbnail({ item }: { item: CatalogExercise }) {
  const [failed, setFailed] = useState(false);
  const uri = item.images[0] ? imageUrl(item.images[0]) : null;
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#EAEDE6',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          accessibilityLabel={exerciseName(item)}
          resizeMode="contain"
          style={{ width: 56, height: 56 }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name="barbell-outline" size={28} color="#5D6B54" />
      )}
    </View>
  );
}
export function ExerciseLibrary({
  profileId,
  remaining,
  existingIds = [],
  single = false,
  onClose,
  onAdd,
}: {
  profileId: string;
  remaining: number;
  existingIds?: string[];
  single?: boolean;
  onClose: () => void;
  onAdd: (items: CatalogExercise[]) => void;
}) {
  const [rows, setRows] = useState<CatalogExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query);
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [filters, setFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<CatalogExercise | null>(null);
  const [tab, setTab] = useState<'all' | 'favorites' | 'selected'>('all');
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

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void loadCatalog()
      .then((result) => {
        if (live) {
          setRows(sortCatalog(result.rows));
          setOffline(result.cached);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  function favorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
    setFavorites(next);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(favoritesKey, JSON.stringify(next));
        window.dispatchEvent(new Event('fitto:exercise-favorites'));
      }
    } catch {
      /* Local storage is optional. */
    }
  }
  function toggle(id: string) {
    if (existingIds.map(animatedCatalogId).includes(id)) return;
    setSelected((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : single
          ? [id]
          : ids.length < remaining
            ? [...ids, id]
            : ids,
    );
  }
  const filtered = useMemo(
    () =>
      rows.filter(
        (e) =>
          (!muscle || e.primaryMuscles.includes(muscle)) &&
          (!equipment || e.equipment === equipment) &&
          (tab !== 'favorites' || favorites.includes(e.id)) &&
          (tab !== 'selected' || selected.includes(e.id)) &&
          matchesExercise(e, search),
      ),
    [rows, muscle, equipment, tab, favorites, selected, search],
  );
  const add = () => onAdd(selected.map((id) => rows.find((e) => e.id === id)!).filter(Boolean));
  const selectedDetail = detail ? selected.includes(detail.id) : false;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#10150E' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderColor: '#2C3627',
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <IconButton
                name={detail ? 'arrow-back' : 'close'}
                label={detail ? 'Voltar aos exercícios' : 'Fechar biblioteca'}
                onPress={() => (detail ? setDetail(null) : onClose())}
              />
              <View style={{ flex: 1 }}>
                <Text variant="caption">Exercícios com GIFs de demonstração</Text>
                <Text variant="title">
                  {detail
                    ? 'Sobre o exercício'
                    : single
                      ? 'Substituir exercício'
                      : 'Adicionar exercícios'}
                </Text>
                <Text variant="caption">
                  {detail
                    ? equipmentLabels[detail.equipment] || detail.equipment
                    : `${selected.length} selecionados`}
                </Text>
              </View>
              {detail ? (
                <IconButton
                  name={favorites.includes(detail.id) ? 'star' : 'star-outline'}
                  label="Favoritar exercício"
                  active={favorites.includes(detail.id)}
                  onPress={() => favorite(detail.id)}
                />
              ) : (
                <IconButton
                  name="options-outline"
                  label="Filtrar exercícios"
                  active={!!muscle || !!equipment || filters}
                  onPress={() => setFilters(!filters)}
                />
              )}
            </View>
            {!detail ? (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#222B1D',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                  }}
                >
                  <Ionicons name="search" color="#95A38A" size={20} />
                  <TextInput
                    accessibilityLabel="Buscar exercícios"
                    placeholder="Buscar exercício"
                    placeholderTextColor="#95A38A"
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      height: 48,
                      paddingHorizontal: 10,
                      color: '#F2F3EE',
                      fontSize: 16,
                    }}
                  />
                  {query ? (
                    <IconButton
                      name="close-circle"
                      label="Limpar busca"
                      onPress={() => setQuery('')}
                    />
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['all', 'favorites', 'selected'] as const).map((t) => (
                    <Pressable
                      key={t}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: tab === t }}
                      onPress={() => {
                        setTab(t);
                        if (t === 'selected') {
                          setQuery('');
                          setMuscle('');
                          setEquipment('');
                        }
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: tab === t ? '#304026' : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text color={tab === t ? accent : '#A3AE9B'} style={{ fontSize: 13 }}>
                        {t === 'all'
                          ? 'Todos'
                          : t === 'favorites'
                            ? 'Favoritos'
                            : `Seleção (${selected.length})`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {filters ? (
                  <View style={{ gap: 8 }}>
                    <Text variant="caption">Músculo principal</Text>
                    <ScrollView
                      horizontal
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{ gap: 6 }}
                    >
                      {[['', 'Todos'], ...Object.entries(muscleLabels)].map(([id, label]) => (
                        <Pressable
                          key={id}
                          accessibilityRole="button"
                          onPress={() => setMuscle(id)}
                          style={{
                            padding: 10,
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: muscle === id ? accent : '#45533B',
                          }}
                        >
                          <Text style={{ fontSize: 13 }} color={muscle === id ? accent : '#D7DECF'}>
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Text variant="caption">Equipamento</Text>
                    <ScrollView
                      horizontal
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{ gap: 6 }}
                    >
                      {[['', 'Todos'], ...Object.entries(equipmentLabels)].map(([id, label]) => (
                        <Pressable
                          key={id}
                          accessibilityRole="button"
                          onPress={() => setEquipment(id)}
                          style={{
                            padding: 10,
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: equipment === id ? accent : '#45533B',
                          }}
                        >
                          <Text
                            style={{ fontSize: 13 }}
                            color={equipment === id ? accent : '#D7DECF'}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Button
                      title="Aplicar filtros"
                      variant="outline"
                      onPress={() => setFilters(false)}
                    />
                  </View>
                ) : null}
                {muscle || equipment ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpar filtros"
                    onPress={() => {
                      setMuscle('');
                      setEquipment('');
                    }}
                  >
                    <Text variant="caption" color={accent}>
                      {[muscleLabels[muscle], equipmentLabels[equipment]]
                        .filter(Boolean)
                        .join(' · ')}{' '}
                      · Limpar ×
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
          {detail ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, padding: 20 }}>
              <Text variant="heading">{exerciseName(detail)}</Text>
              {exerciseName(detail) !== detail.name ? (
                <Text variant="caption">{detail.name}</Text>
              ) : null}
              {detail.images.map((path) => (
                <CatalogImage key={path} path={path} name={detail.name} />
              ))}
              <Text>{detail.primaryMuscles.map((m) => muscleLabels[m] || m).join(', ')}</Text>
              <Text variant="caption">Instruções da fonte em inglês</Text>
              {detail.instructions.map((step, i) => (
                <Text key={i}>
                  {i + 1}. {step}
                </Text>
              ))}
              <Button
                title="Fonte: ExerciseDB / AscendAPI"
                variant="ghost"
                onPress={() => void Linking.openURL(CATALOG_SOURCE)}
              />
            </ScrollView>
          ) : (
            <>
              {offline ? (
                <Text variant="caption" style={{ padding: 10 }}>
                  Catálogo salvo no dispositivo · conexão indisponível.
                </Text>
              ) : null}
              {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                  <ActivityIndicator color={accent} />
                  <Text>Carregando exercícios…</Text>
                </View>
              ) : error ? (
                <View style={{ padding: 20, gap: 12 }}>
                  <Text accessibilityRole="alert">{error}</Text>
                  <Button
                    title="Tentar novamente"
                    onPress={() => {
                      setLoading(true);
                      setError('');
                      setAttempt((n) => n + 1);
                    }}
                  />
                </View>
              ) : (
                <FlatList
                  style={{ flex: 1 }}
                  data={filtered}
                  keyExtractor={(e) => e.id}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={12}
                  windowSize={5}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  ListHeaderComponent={
                    <Text variant="caption" style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                      {filtered.length} exercícios
                      {!query && tab === 'all' ? ' · mais usados primeiro' : ''}
                    </Text>
                  }
                  ListEmptyComponent={
                    <View style={{ padding: 28, gap: 8 }}>
                      <Text variant="title">
                        {tab === 'selected'
                          ? 'Escolha seus exercícios'
                          : 'Nenhum exercício encontrado'}
                      </Text>
                      <Text variant="caption">
                        {tab === 'favorites'
                          ? 'Toque na estrela de um exercício para salvá-lo.'
                          : 'Tente outro nome ou limpe os filtros.'}
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const chosen = selected.includes(item.id),
                      added = existingIds.map(animatedCatalogId).includes(item.id),
                      limited = !single && !chosen && selected.length >= remaining;
                    return (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderBottomWidth: 1,
                          borderColor: '#242E20',
                          paddingLeft: 16,
                          paddingRight: 6,
                          backgroundColor: chosen ? '#23341B' : 'transparent',
                        }}
                      >
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityLabel={`Selecionar ${exerciseName(item)}`}
                          accessibilityState={{
                            checked: chosen || added,
                            disabled: added || limited,
                          }}
                          disabled={added || limited}
                          onPress={() => toggle(item.id)}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            gap: 12,
                            alignItems: 'center',
                            paddingVertical: 12,
                            minHeight: 86,
                            opacity: added || limited ? 0.55 : 1,
                          }}
                        >
                          <Thumbnail item={item} />
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600' }}>
                              {exerciseName(item)}
                            </Text>
                            <Text variant="caption">
                              {item.primaryMuscles.map((m) => muscleLabels[m] || m).join(', ')} ·{' '}
                              {equipmentLabels[item.equipment] || item.equipment}
                            </Text>
                            {added ? (
                              <Text variant="caption" color={accent}>
                                Já está nesta divisão
                              </Text>
                            ) : null}
                          </View>
                          <View
                            style={{
                              width: 25,
                              height: 25,
                              borderWidth: chosen || added ? 0 : 1,
                              borderColor: '#66775A',
                              borderRadius: 13,
                              backgroundColor: chosen || added ? accent : 'transparent',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {chosen || added ? (
                              <Ionicons name="checkmark" size={18} color="#10150E" />
                            ) : null}
                          </View>
                        </Pressable>
                        <View>
                          <IconButton
                            name="information-circle-outline"
                            label={`Detalhes de ${exerciseName(item)}`}
                            onPress={() => setDetail(item)}
                          />
                          <IconButton
                            name={favorites.includes(item.id) ? 'star' : 'star-outline'}
                            label={`Favoritar ${exerciseName(item)}`}
                            active={favorites.includes(item.id)}
                            onPress={() => favorite(item.id)}
                          />
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </>
          )}
          <View
            style={{
              padding: 16,
              gap: 8,
              borderTopWidth: 1,
              borderColor: '#34432A',
              backgroundColor: '#192214',
            }}
          >
            {selected.length >= remaining && remaining > 0 ? (
              <Text variant="caption">Limite de {remaining} novos exercícios nesta divisão.</Text>
            ) : null}
            {detail ? (
              <Button
                title={
                  existingIds.includes(detail.id)
                    ? 'Já adicionado ao treino'
                    : selectedDetail
                      ? 'Remover da seleção'
                      : 'Selecionar exercício'
                }
                disabled={
                  existingIds.includes(detail.id) ||
                  (!single && !selectedDetail && selected.length >= remaining)
                }
                variant="outline"
                onPress={() => toggle(detail.id)}
              />
            ) : null}
            <Button
              title={
                selected.length
                  ? single
                    ? 'Usar este exercício'
                    : `Adicionar ao treino (${selected.length})`
                  : 'Selecione os exercícios'
              }
              disabled={!selected.length || selected.length > remaining}
              onPress={add}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
