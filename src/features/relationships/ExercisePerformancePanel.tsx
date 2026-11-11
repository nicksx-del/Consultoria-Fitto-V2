import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Text } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import type { Exercise } from './workoutModel';
import type { PersonalRecord } from './trainingAchievements';
import type { exercisePerformance } from './exercisePerformance';

const lime = '#C9F78C';
const teal = '#9BE4D5';
const gold = '#F7CC6A';
const muted = '#B2C0AA';
const formatWeight = (weight: number) =>
  weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const shortDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const fullDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
const seriesLabel = (set: { weight: number; reps: number }) =>
  `${formatWeight(set.weight)} kg × ${set.reps} reps`;

type PerformanceData = ReturnType<typeof exercisePerformance>;

export function PerformanceButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.shortcut}>
      <Ionicons name="stats-chart-outline" size={16} color={lime} />
      <Text color={lime} style={{ fontSize: 12 }}>
        Meu desempenho
      </Text>
    </Pressable>
  );
}

function MarkCard({
  title,
  value,
  detail,
  color,
  icon,
}: {
  title: string;
  value?: number;
  detail: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[styles.mark, { borderTopColor: color }]}>
      <Ionicons name={icon} size={17} color={color} />
      <Text variant="caption" color={muted}>
        {title}
      </Text>
      <Text color={color} style={styles.number}>
        {value === undefined ? '—' : `${formatWeight(value)} kg`}
      </Text>
      <Text variant="caption">{detail}</Text>
    </View>
  );
}

function LoadHistory({ sessions }: { sessions: PerformanceData['recent'] }) {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const latest = sessions.at(-1);
  const selected = sessions.find((session) => session.id === selectedId) ?? latest;
  if (!selected || !latest) return null;
  const max = Math.max(1, ...sessions.map((session) => session.peak));
  const previous = sessions.at(-2);
  const delta = previous ? latest.peak - previous.peak : null;
  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <Text variant="title">Evolução</Text>
        {delta !== null ? (
          <Text
            variant="caption"
            color={delta > 0 ? lime : delta < 0 ? gold : muted}
            style={styles.pill}
          >
            {delta > 0 ? '+' : ''}
            {formatWeight(delta)} kg na última sessão
          </Text>
        ) : null}
      </View>
      <Text variant="caption" color={muted}>
        Maior carga por sessão
      </Text>
      <View style={styles.chart}>
        {sessions.map((session, index) => {
          const active = session.id === selected.id;
          return (
            <Pressable
              key={session.id}
              accessibilityRole="button"
              accessibilityLabel={`Sessão ${index + 1}, ${fullDate(session.date)}, ${formatWeight(session.peak)} kg`}
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedId(session.id)}
              style={styles.chartItem}
            >
              <Text variant="caption" color={active ? lime : muted} style={styles.chartLabel}>
                {formatWeight(session.peak)}
              </Text>
              <View style={styles.chartTrack}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: Math.max(3, (62 * session.peak) / max),
                      backgroundColor: active ? lime : '#528C77',
                    },
                  ]}
                />
              </View>
              <Text variant="caption" color={active ? lime : muted} style={styles.chartLabel}>
                {shortDate(session.date)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.inset}>
        <Text variant="caption" color={muted}>
          {fullDate(selected.date)} ·{' '}
          {new Date(selected.date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Text color={lime} style={{ fontWeight: '700' }}>
          {formatWeight(selected.peak)} kg
        </Text>
      </View>
    </View>
  );
}

export function ExercisePerformance({
  exercise,
  data,
  records,
  onClose,
}: {
  exercise: Exercise;
  data: PerformanceData;
  records: PersonalRecord[];
  onClose: () => void;
}) {
  const [reps, setReps] = useState<number | null>(
    data.target ? null : (data.byReps[0]?.reps ?? null),
  );
  const mark = reps === null ? data.targetBest : data.byReps.find((set) => set.reps === reps);
  const { bestLoad, bestEstimate, last } = data;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <Screen withPadding={false} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar ao treino"
            onPress={onClose}
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={21} color={lime} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={lime}>
              Meu desempenho
            </Text>
            <Text variant="title">{exercise.name}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            {records.map((record) => (
              <View key={record.key} style={[styles.card, styles.record]}>
                <Ionicons name="trophy" size={22} color={gold} />
                <View style={{ flex: 1 }}>
                  <Text color={gold}>
                    Recorde de {record.type === 'load' ? 'carga' : 'repetições'} · série{' '}
                    {record.setIndex + 1}
                  </Text>
                  <Text variant="caption">
                    {formatWeight(record.before)} → {formatWeight(record.value)}
                    {record.type === 'load'
                      ? ' kg'
                      : ` reps com ${formatWeight(record.weight ?? 0)} kg`}
                  </Text>
                </View>
              </View>
            ))}
            {bestLoad ? (
              <>
                <View style={styles.marks}>
                  <MarkCard
                    title="Maior carga"
                    value={bestLoad.weight}
                    detail={`${bestLoad.reps} reps · ${fullDate(bestLoad.date)}`}
                    color={lime}
                    icon="barbell-outline"
                  />
                  <MarkCard
                    title="Melhor 1RM estimado"
                    value={bestEstimate?.estimate}
                    detail={
                      bestEstimate
                        ? `${seriesLabel(bestEstimate)} · ${fullDate(bestEstimate.date)}`
                        : 'Disponível com séries de 1 a 10 reps.'
                    }
                    color={teal}
                    icon="flash-outline"
                  />
                </View>
                <LoadHistory sessions={data.recent} />
                <View style={styles.card}>
                  <Text variant="title">Melhor carga por reps</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filters}
                  >
                    {[...(data.target ? [null] : []), ...data.byReps.map((set) => set.reps)].map(
                      (option) => (
                        <Pressable
                          key={option ?? 'target'}
                          accessibilityRole="button"
                          accessibilityState={{ selected: reps === option }}
                          onPress={() => setReps(option)}
                          style={[styles.filter, reps === option && styles.activeFilter]}
                        >
                          <Text
                            color={reps === option ? '#14200E' : muted}
                            style={{ fontSize: 12 }}
                          >
                            {option === null ? `Meta · ${data.target} reps` : `${option} reps`}
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </ScrollView>
                  <View style={styles.inset} accessibilityLiveRegion="polite">
                    {mark ? (
                      <>
                        <Text color={lime} style={{ fontWeight: '700' }}>
                          {seriesLabel(mark)}
                        </Text>
                        <Text variant="caption">{fullDate(mark.date)}</Text>
                      </>
                    ) : (
                      <Text variant="caption">Sem marca para esta meta.</Text>
                    )}
                  </View>
                </View>
                <View style={styles.card}>
                  <View style={styles.headingRow}>
                    <Text variant="title">Sessão anterior</Text>
                    {last ? (
                      <Text variant="caption" color={muted}>
                        {fullDate(last.date)}
                      </Text>
                    ) : null}
                  </View>
                  {last ? (
                    <View style={styles.series}>
                      {last.sets.map((set, index) => (
                        <View key={index} style={styles.seriesPill}>
                          <Text variant="caption" color={teal}>
                            {seriesLabel(set)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text variant="caption">Primeira sessão com registro comparável.</Text>
                  )}
                </View>
                <DetailsPanel title="Como as marcas são calculadas">
                  <Text variant="caption">
                    O painel usa séries de trabalho do histórico disponível e a carga em kg conforme
                    o registro. O 1RM é estimado pela fórmula de Epley para séries de até 10
                    repetições.
                  </Text>
                </DetailsPanel>
              </>
            ) : (
              <View style={styles.card}>
                <Text variant="title">Sem séries comparáveis</Text>
                <Text variant="caption">
                  {exercise.metric && exercise.metric !== 'reps'
                    ? 'Essas marcas usam exercícios registrados em carga e repetições.'
                    : 'Conclua uma série de trabalho com carga e repetições para criar sua primeira marca.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#10150F' },
  header: {
    width: '100%',
    maxWidth: 592,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#293528',
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#253421',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#27371F',
  },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 9 },
  card: {
    padding: 12,
    gap: 7,
    borderRadius: 15,
    backgroundColor: '#192219',
    borderWidth: 1,
    borderColor: '#2B382A',
  },
  marks: { flexDirection: 'row', gap: 8 },
  mark: {
    flex: 1,
    minWidth: 0,
    padding: 11,
    gap: 4,
    borderRadius: 15,
    backgroundColor: '#1D2A20',
    borderWidth: 1,
    borderTopWidth: 2,
    borderColor: '#334536',
  },
  number: { fontSize: 24, fontWeight: '800', lineHeight: 29 },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: '#66512C',
    backgroundColor: '#342A17',
  },
  headingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  pill: { backgroundColor: '#273426', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  chart: { flexDirection: 'row', gap: 4, paddingTop: 2 },
  chartItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 3 },
  chartLabel: { fontSize: 10, textAlign: 'center' },
  chartTrack: { height: 62, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '66%', maxWidth: 45, borderRadius: 5 },
  inset: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    padding: 8,
    backgroundColor: '#111A13',
    borderRadius: 9,
  },
  filters: { gap: 6 },
  filter: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 9,
    justifyContent: 'center',
    backgroundColor: '#273426',
  },
  activeFilter: { backgroundColor: lime },
  series: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  seriesPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#22362E',
  },
});
