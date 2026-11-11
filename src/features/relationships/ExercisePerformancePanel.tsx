import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Text } from '@/components/ui';
import type { Exercise } from './workoutModel';
import type { PersonalRecord } from './trainingAchievements';
import type { exercisePerformance } from './exercisePerformance';

const accent = '#C9F78C';
const gold = '#F7CC6A';
const surface = { padding: 12, gap: 6, borderRadius: 14, backgroundColor: '#1D2818' };
const formatWeight = (weight: number) =>
  weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const seriesLabel = (set: { weight: number; reps: number }) =>
  `${formatWeight(set.weight)} kg × ${set.reps} reps`;

export function PerformanceButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        minHeight: 44,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: '#27371F',
      }}
    >
      <Ionicons name="stats-chart-outline" size={16} color={accent} />
      <Text color={accent} style={{ fontSize: 12 }}>
        Meu desempenho
      </Text>
    </Pressable>
  );
}

export function ExercisePerformance({
  exercise,
  data,
  records,
  onClose,
}: {
  exercise: Exercise;
  data: ReturnType<typeof exercisePerformance>;
  records: PersonalRecord[];
  onClose: () => void;
}) {
  const [selectedReps, setSelectedReps] = useState<number | null>(
    data.target ? null : (data.byReps[0]?.reps ?? null),
  );
  const selected =
    selectedReps === null ? data.targetBest : data.byReps.find((set) => set.reps === selectedReps);
  const chartMax = Math.max(1, ...data.recent.map((session) => session.peak));
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <Screen scrollable contentContainerStyle={{ paddingVertical: 16 }}>
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar ao treino"
              onPress={onClose}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#26351F',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={22} color={accent} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={accent}>
                Meu desempenho
              </Text>
              <Text variant="title">{exercise.name}</Text>
            </View>
          </View>
          {records.map((record) => (
            <View
              key={record.key}
              style={{
                ...surface,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#3D2F15',
              }}
            >
              <Ionicons name="trophy" size={20} color={gold} />
              <View style={{ flex: 1 }}>
                <Text color={gold}>
                  Recorde de {record.type === 'load' ? 'carga' : 'repetições'}
                </Text>
                <Text variant="caption">
                  {formatWeight(record.before)} → {formatWeight(record.value)}
                  {record.type === 'load'
                    ? ' kg'
                    : ` reps com ${formatWeight(record.weight ?? 0)} kg`}
                  {' · série '}
                  {record.setIndex + 1}
                </Text>
              </View>
            </View>
          ))}
          {data.bestLoad ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ ...surface, flex: 1 }}>
                  <Text variant="caption">Maior carga</Text>
                  <Text variant="title" color={accent}>
                    {formatWeight(data.bestLoad.weight)} kg
                  </Text>
                  <Text variant="caption">
                    {data.bestLoad.reps} reps · {formatDate(data.bestLoad.date)}
                  </Text>
                </View>
                <View style={{ ...surface, flex: 1 }}>
                  <Text variant="caption">Melhor 1RM estimado</Text>
                  <Text variant="title" color={accent}>
                    {data.bestEstimate ? `${formatWeight(data.bestEstimate.estimate)} kg` : '—'}
                  </Text>
                  <Text variant="caption">
                    {data.bestEstimate
                      ? `${seriesLabel(data.bestEstimate)} · ${formatDate(data.bestEstimate.date)}`
                      : 'Requer uma série de 1 a 10 reps com carga.'}
                  </Text>
                </View>
              </View>
              <View style={surface}>
                <Text variant="title">Melhor carga por reps</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {[...(data.target ? [null] : []), ...data.byReps.map((set) => set.reps)].map(
                    (reps) => {
                      const active = selectedReps === reps;
                      return (
                        <Pressable
                          key={reps ?? 'target'}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => setSelectedReps(reps)}
                          style={{
                            minHeight: 44,
                            minWidth: 44,
                            paddingHorizontal: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: 10,
                            backgroundColor: active ? accent : '#2A3823',
                          }}
                        >
                          <Text color={active ? '#172111' : '#DFE9D7'}>
                            {reps === null ? 'Meta de hoje' : `${reps} reps`}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </ScrollView>
                {selectedReps === null && data.target ? (
                  <Text variant="caption">Meta · {data.target} reps</Text>
                ) : null}
                <Text>
                  {selected
                    ? `${seriesLabel(selected)} · ${formatDate(selected.date)}`
                    : 'Sem marca para esta meta.'}
                </Text>
              </View>
              <View style={surface}>
                <Text variant="title">Última vez</Text>
                {data.last ? (
                  <Text>
                    {formatDate(data.last.date)} · {data.last.sets.map(seriesLabel).join('  /  ')}
                  </Text>
                ) : (
                  <Text variant="caption">Primeira sessão com registro comparável.</Text>
                )}
              </View>
              <View style={surface}>
                <Text variant="title">Evolução</Text>
                <Text variant="caption">Maior carga nas últimas sessões registradas</Text>
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {data.recent.map((session) => (
                    <View key={session.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text variant="caption" style={{ fontSize: 10 }}>
                        {formatWeight(session.peak)} kg
                      </Text>
                      <View
                        style={{
                          height: 64,
                          width: '100%',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: '64%',
                            maxWidth: 42,
                            height: Math.max(2, (64 * session.peak) / chartMax),
                            backgroundColor: accent,
                            borderRadius: 5,
                          }}
                        />
                      </View>
                      <Text variant="caption" style={{ fontSize: 10 }}>
                        {formatDate(session.date)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text variant="caption">
                Séries de trabalho do histórico disponível. Carga em kg conforme o registro.
                Estimativa de 1RM por Epley, até 10 reps.
              </Text>
            </>
          ) : (
            <View style={surface}>
              <Text variant="title">Sem séries comparáveis</Text>
              <Text variant="caption">
                {exercise.metric && exercise.metric !== 'reps'
                  ? 'Essas marcas usam exercícios registrados em carga e repetições.'
                  : 'Conclua uma série de trabalho com carga e repetições para criar sua primeira marca.'}
              </Text>
            </View>
          )}
        </View>
      </Screen>
    </Modal>
  );
}
