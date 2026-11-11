import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Text } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import { effortLabel, unit, type Exercise } from './workoutModel';
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

const metrics = [
  { key: 'peak', label: 'Carga', unit: 'kg' },
  { key: 'estimate', label: '1RM', unit: 'kg' },
  { key: 'volume', label: 'Volume', unit: 'kg' },
  { key: 'reps', label: 'Reps', unit: 'reps' },
] as const;
const periods = [
  { label: 'Últimas 6', days: 0 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
] as const;

function Filter({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filter, selected && styles.activeFilter]}
    >
      <Text color={selected ? '#14200E' : muted} style={{ fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function LoadHistory({ sessions }: { sessions: PerformanceData['sessions'] }) {
  const [metric, setMetric] = useState<(typeof metrics)[number]>(metrics[0]);
  const [days, setDays] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [openedAt] = useState(() => Date.now());
  const cutoff = openedAt - days * 86_400_000;
  const eligible = days
    ? sessions.filter((session) => Date.parse(session.date) >= cutoff)
    : sessions.slice(-6);
  const points = eligible
    .flatMap((session) => {
      const value = session[metric.key];
      return value === undefined ? [] : [{ ...session, value }];
    })
    .reverse();
  const selected = points.find((point) => point.id === selectedId) ?? points[0];
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <View style={styles.card}>
      <Text variant="title">Evolução</Text>
      <View style={styles.series}>
        {metrics.map((option) => (
          <Filter
            key={option.key}
            label={option.label}
            selected={metric.key === option.key}
            onPress={() => {
              setMetric(option);
              setSelectedId(undefined);
            }}
          />
        ))}
      </View>
      <View style={styles.series}>
        {periods.map((period) => (
          <Filter
            key={period.days}
            label={period.label}
            selected={days === period.days}
            onPress={() => {
              setDays(period.days);
              setSelectedId(undefined);
            }}
          />
        ))}
      </View>
      {selected ? (
        <>
          <Text variant="caption" color={muted}>
            Sessões mais recentes primeiro · {metric.unit}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={points.length > 6}
            contentContainerStyle={styles.chart}
          >
            {points.map((point) => {
              const active = point.id === selected.id;
              return (
                <Pressable
                  key={point.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${fullDate(point.date)}, ${formatWeight(point.value)} ${metric.unit}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedId(point.id)}
                  style={styles.chartItem}
                >
                  <Text variant="caption" color={active ? lime : muted} style={styles.chartLabel}>
                    {formatWeight(point.value)}
                  </Text>
                  <View style={styles.chartTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: Math.max(3, (62 * point.value) / max),
                          backgroundColor: active ? lime : '#528C77',
                        },
                      ]}
                    />
                  </View>
                  <Text variant="caption" color={active ? lime : muted} style={styles.chartLabel}>
                    {shortDate(point.date)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.inset} accessibilityLiveRegion="polite">
            <Text variant="caption" color={muted}>
              {selected.name} · {fullDate(selected.date)} ·{' '}
              {new Date(selected.date).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text color={lime} style={{ fontWeight: '700' }}>
              {formatWeight(selected.value)} {metric.unit}
            </Text>
          </View>
        </>
      ) : (
        <Text variant="caption">Sem dados para esta métrica no período.</Text>
      )}
    </View>
  );
}

function SessionHistory({ sessions }: { sessions: PerformanceData['sessions'] }) {
  return sessions.length ? (
    [...sessions].reverse().map((session) => (
      <View key={session.id} style={styles.card}>
        <DetailsPanel
          title={`${session.active ? 'Em andamento' : fullDate(session.date)} · ${session.name} · ${session.sets.length} séries · até ${formatWeight(session.peak)} kg`}
        >
          {session.sets.map((set, index) => (
            <View key={index} style={styles.inset}>
              <Text>{seriesLabel(set)}</Text>
              {set.effort || set.quality ? (
                <Text variant="caption" color={muted}>
                  {[
                    set.effort && effortLabel(set.effort),
                    set.quality && { good: 'Boa', fair: 'Regular', poor: 'Ruim' }[set.quality],
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
            </View>
          ))}
        </DetailsPanel>
      </View>
    ))
  ) : (
    <Text variant="caption">Sem sessões com séries comparáveis.</Text>
  );
}

export function ExercisePerformance({
  exercise,
  data,
  records,
  onClose,
  previousWeight,
  nextSeries,
  onUseWeight,
}: {
  exercise: Exercise;
  data: PerformanceData;
  records: PersonalRecord[];
  onClose: () => void;
  previousWeight?: number;
  nextSeries: number;
  onUseWeight: (weight: number) => void;
}) {
  const [tab, setTab] = useState<'Resumo' | 'Histórico'>('Resumo');
  const { bestLoad, bestEstimate, last, targetRange } = data;
  const lastSet = last?.sets.at(-1);

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
        <View style={styles.tabs}>
          {(['Resumo', 'Histórico'] as const).map((option) => (
            <Filter
              key={option}
              label={option}
              selected={tab === option}
              onPress={() => setTab(option)}
            />
          ))}
        </View>
        <ScrollView
          key={tab}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            {tab === 'Histórico' ? (
              <SessionHistory sessions={data.sessions} />
            ) : (
              <>
                <View style={styles.marks}>
                  <View style={[styles.card, { flex: 1 }]}>
                    <Text variant="caption" color={lime}>
                      Meta de hoje
                    </Text>
                    <Text>
                      {data.target ? `${data.target} ${unit(exercise)}` : 'Consulte a prescrição'}
                    </Text>
                    {data.targetEffort ? (
                      <Text variant="caption">{effortLabel(data.targetEffort)}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.card, { flex: 1 }]}>
                    <Text variant="caption" color={teal}>
                      Última série
                    </Text>
                    <Text>{lastSet ? seriesLabel(lastSet) : 'Sem registro anterior'}</Text>
                    {lastSet ? (
                      <Text variant="caption">
                        {fullDate(lastSet.date)}
                        {lastSet.effort ? ` · ${effortLabel(lastSet.effort)}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {previousWeight !== undefined ? (
                  <Filter
                    label={`Usar ${formatWeight(previousWeight)} kg na série ${nextSeries}`}
                    selected={false}
                    onPress={() => onUseWeight(previousWeight)}
                  />
                ) : null}
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
                    <LoadHistory sessions={data.sessions} />
                    <View style={styles.card}>
                      <Text variant="title">Recordes por reps</Text>
                      <View style={styles.tableRow}>
                        <Text variant="caption" style={{ flex: 1 }}>
                          Reps
                        </Text>
                        <Text variant="caption" style={{ flex: 1 }}>
                          Maior carga
                        </Text>
                        <Text variant="caption" style={{ flex: 1 }} align="right">
                          Data
                        </Text>
                      </View>
                      {data.byReps.map((set) => {
                        const inTarget =
                          targetRange && set.reps >= targetRange[0] && set.reps <= targetRange[1];
                        return (
                          <View
                            key={set.reps}
                            style={[styles.tableRow, inTarget && styles.targetRow]}
                          >
                            <Text color={inTarget ? lime : undefined} style={{ flex: 1 }}>
                              {set.reps}
                              {inTarget ? ' · Meta' : ''}
                            </Text>
                            <Text style={{ flex: 1 }}>{formatWeight(set.weight)} kg</Text>
                            <Text variant="caption" align="right" style={{ flex: 1 }}>
                              {fullDate(set.date)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <DetailsPanel title="Como as marcas são calculadas">
                      <Text variant="caption">
                        O painel usa séries de trabalho do histórico disponível e a carga em kg
                        conforme o registro. O 1RM é estimado pela fórmula de Epley para séries de
                        até 10 repetições.
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
              </>
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
  tabs: {
    width: '100%',
    maxWidth: 592,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  targetRow: { backgroundColor: '#273D22' },
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
  chart: { flexGrow: 1, flexDirection: 'row', gap: 4, paddingTop: 2 },
  chartItem: { flex: 1, minWidth: 44, alignItems: 'center', gap: 3 },
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
  filter: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 9,
    justifyContent: 'center',
    backgroundColor: '#273426',
  },
  activeFilter: { backgroundColor: lime },
  series: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
});
