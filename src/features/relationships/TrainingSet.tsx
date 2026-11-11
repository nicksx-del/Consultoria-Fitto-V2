import { SetTableHeader, SetTableRow } from './SetTableRow';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DetailsPanel } from './DetailsPanel';
import { QuickSetEntry } from './QuickSetEntry';
import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { Exercise, effortLabel, setEffort, unit } from './workoutModel';
import { kindInfo, seriesFor, techniqueInfo } from './trainingMethods';
import { SetLog, StepLog, emptyStep, summarizeSteps } from './trainingRuntime';
import { EffortPicker } from './EffortPicker';
import { TrainingHelp } from './TrainingHelp';
import type { PreviousSet } from './trainingExperience';
function NumericLog({
  label,
  value,
  max = 1000000,
  onChange,
  decimal = false,
}: {
  label: string;
  value?: number | null;
  max?: number;
  onChange: (n: number | null) => void;
  decimal?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <TextField
      containerStyle={{ flex: 1, minWidth: 0, width: undefined }}
      inputStyle={{ fontSize: 20, fontWeight: '600', textAlign: 'center' }}
      placeholder="—"
      label={label}
      value={editing ?? (value == null ? '' : String(value))}
      onBlur={() => setEditing(null)}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      onChangeText={(v) => {
        if (!(decimal ? /^\d*(?:[.,]\d*)?$/.test(v) : /^\d*$/.test(v))) return;
        const n = Number(v.replace(',', '.'));
        if (v === '.' || v === ',') {
          setEditing(v);
          return;
        }
        if (!v || (Number.isFinite(n) && n >= 0 && n <= max && (decimal || Number.isInteger(n)))) {
          setEditing(v);
          onChange(v ? n : null);
        }
      }}
    />
  );
}
function TechniqueRunner({
  exercise,
  setIndex,
  log,
  onChange,
  finalRest,
  previous,
}: {
  exercise: Exercise;
  setIndex: number;
  log: SetLog;
  onChange: (value: Partial<SetLog>, rest?: number) => void;
  finalRest: number;
  previous?: PreviousSet;
}) {
  const technique = seriesFor(exercise, setIndex).technique!;
  const [now, setNow] = useState(() => Date.now());
  const [review, setReview] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const steps = technique.steps.map((_, i) => log.steps?.[i] ?? emptyStep());
  const first = steps.findIndex((s) => !s.done);
  const index = review ?? (first < 0 ? steps.length - 1 : first);
  const target = technique.steps[index],
    actual = steps[index];
  function patch(value: Partial<StepLog>, rest?: number) {
    const updated = steps.map((s, i) =>
      i === index
        ? { ...s, ...value }
        : value.done === false && i > index
          ? { ...s, done: false }
          : s,
    );
    onChange(summarizeSteps(updated, technique.type === 'isometric'), rest);
  }
  const seconds = actual.hold_until
    ? Math.max(0, Math.ceil((new Date(actual.hold_until).getTime() - now) / 1000))
    : 0;
  const previousWeight = steps[index - 1]?.weight;
  return (
    <View style={{ gap: 10, padding: 12, backgroundColor: '#23351A', borderRadius: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="title" style={{ flex: 1 }}>
          {techniqueInfo[technique.type].label} · etapa {index + 1}/{steps.length}
        </Text>
        <TrainingHelp info={techniqueInfo[technique.type]} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {steps.map((s, i) => (
          <Button
            key={i}
            title={`${s.done ? '✓ ' : ''}${i + 1}`}
            variant={i === index ? 'primary' : 'outline'}
            onPress={() => setReview(i)}
          />
        ))}
      </View>
      <Text>
        Alvo:{' '}
        {technique.type === 'isometric'
          ? `${target.seconds}s de sustentação`
          : `${target.target} ${unit(exercise)}`}{' '}
        · {target.load || 'carga livre'}
      </Text>
      {target.reduction ? (
        <Text variant="caption">
          Reduzir {target.reduction}% da etapa anterior
          {previousWeight != null
            ? ` · referência: ${(previousWeight * (1 - Number(target.reduction) / 100)).toFixed(2).replace('.', ',')} kg`
            : ''}
          . Registre a carga efetivamente usada.
        </Text>
      ) : null}
      <NumericLog
        label="Carga realizada nesta etapa (kg)"
        value={actual.weight}
        max={2000}
        decimal
        onChange={(weight) => patch({ weight })}
      />
      {previous?.log.steps?.[index] ? (
        <Text variant="caption">
          Etapa anterior: {previous.log.steps[index].weight ?? '—'} kg ·{' '}
          {technique.type === 'isometric'
            ? `${previous.log.steps[index].seconds ?? '—'} s`
            : `${previous.log.steps[index].reps ?? '—'} ${unit(exercise)}`}
        </Text>
      ) : null}
      {technique.type === 'isometric' ? (
        <>
          <Button
            title={
              actual.hold_until ? 'Reiniciar sustentação' : 'Iniciar cronômetro de sustentação'
            }
            variant="outline"
            onPress={() =>
              patch({
                hold_until: new Date(Date.now() + Number(target.seconds) * 1000).toISOString(),
              })
            }
          />
          {actual.hold_until ? <Text>Sustentação: {seconds}s restantes</Text> : null}
          <NumericLog
            label="Tempo efetivamente realizado (s)"
            value={actual.seconds}
            max={1800}
            onChange={(value) => patch({ seconds: value })}
          />
        </>
      ) : (
        <NumericLog
          label={`Realizado nesta etapa (${unit(exercise)})`}
          value={actual.reps}
          onChange={(reps) => patch({ reps })}
        />
      )}
      <Text variant="caption">
        {index < steps.length - 1
          ? `Após esta etapa: ${target.rest}s antes da próxima.`
          : `Após esta série: ${finalRest}s de descanso.`}
      </Text>
      <Button
        title={
          actual.done
            ? 'Reabrir etapa'
            : index === steps.length - 1
              ? 'Concluir etapa e série'
              : 'Concluir etapa e iniciar pausa'
        }
        disabled={!actual.done && index > first && first !== -1}
        onPress={() => {
          const done = !actual.done;
          patch(
            { done },
            done ? (index < steps.length - 1 ? Number(target.rest) : finalRest) : undefined,
          );
          if (done) setReview(null);
        }}
      />
      {log.done ? <Text color="#B7F34A">Todas as etapas desta série foram concluídas.</Text> : null}
    </View>
  );
}
function TrainingSetDetails({
  exercise,
  index,
  log,
  onChange,
  finalRest,
  previous,
  preceding,
}: {
  exercise: Exercise;
  index: number;
  log: SetLog;
  onChange: (value: Partial<SetLog>, rest?: number) => void;
  finalRest?: number;
  previous?: PreviousSet;
  preceding?: SetLog;
}) {
  const p = seriesFor(exercise, index);
  const [feedback, setFeedback] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const rest = finalRest ?? Number(p.rest);
  if (log.done && !reviewCompleted)
    return (
      <View
        style={{
          padding: 14,
          gap: 8,
          borderRadius: 16,
          backgroundColor: '#25351C',
          borderWidth: 1,
          borderColor: '#587A37',
        }}
      >
        <Text color="#C0F568">✓ Série {index + 1} concluída</Text>
        <Text variant="caption">
          {log.weight ?? '—'} kg ·{' '}
          {p.technique?.type === 'isometric'
            ? `${log.seconds ?? '—'} s`
            : `${log.reps ?? '—'} ${unit(exercise)}`}
          {log.actual_effort ? ` · ${effortLabel(log.actual_effort)}` : ''}
        </Text>
        <Button
          title={`Editar registro da série ${index + 1}`}
          variant="ghost"
          onPress={() => setReviewCompleted(true)}
        />
        <Button
          title={`Desfazer conclusão da série ${index + 1}`}
          variant="outline"
          onPress={() => {
            onChange(
              p.technique && log.steps
                ? summarizeSteps(
                    log.steps.map((s) => ({ ...s, done: false, hold_until: null })),
                    p.technique.type === 'isometric',
                  )
                : { done: false },
            );
            setReviewCompleted(false);
          }}
        />
      </View>
    );
  return (
    <View
      style={{
        gap: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: log.done ? '#587A37' : '#34442C',
        backgroundColor: log.done ? '#25351C' : '#111A0D',
        borderRadius: 16,
      }}
    >
      <Text variant="caption">
        Prescrito: {p.target} {unit(exercise)} · {p.load || 'carga livre'} · {rest}s descanso
        {setEffort(exercise, index) ? ' · ' + effortLabel(setEffort(exercise, index)) : ''}
      </Text>
      {p.notes ? <Text color="#D8EBCC">Orientação: {p.notes}</Text> : null}
      <DetailsPanel title="Esforço, histórico e prescrição">
        <TrainingHelp info={kindInfo[p.kind]} />
        <Button
          title={
            log.actual_effort
              ? `Esforço realizado: ${effortLabel(log.actual_effort)} · editar`
              : 'Registrar esforço · RIR/RPE'
          }
          variant="ghost"
          onPress={() => setFeedback(true)}
        />

        {previous ? (
          <View style={{ gap: 3, padding: 10, borderRadius: 10, backgroundColor: '#20291A' }}>
            <Text variant="caption">
              Última execução · {new Date(previous.date).toLocaleDateString('pt-BR')}
            </Text>
            <Text variant="caption">
              {previous.log.weight ?? '—'} kg ·{' '}
              {p.technique?.type === 'isometric'
                ? `${previous.log.seconds ?? '—'} s de sustentação`
                : `${previous.log.reps ?? '—'} ${unit(exercise)}`}
              {previous.log.actual_effort ? ` · ${effortLabel(previous.log.actual_effort)}` : ''}
              {p.technique ? ' · série completa' : ''}
            </Text>
          </View>
        ) : null}
        {setEffort(exercise, index) ? (
          <Text color="#B7F34A">Meta prescrita: {effortLabel(setEffort(exercise, index))}</Text>
        ) : null}
        {exercise.progression &&
        !p.technique &&
        (!exercise.metric || exercise.metric === 'reps') ? (
          <View style={{ padding: 12, gap: 4, borderRadius: 12, backgroundColor: '#26371C' }}>
            <Text color="#C0F568">Progressão orientada pelo treinador</Text>
            <Text variant="caption">
              {exercise.progression.mode === 'load'
                ? `Ao atingir ${exercise.progression.target_reps} repetições nas séries de trabalho, o incremento previsto é ${exercise.progression.increment.toLocaleString('pt-BR')} kg.`
                : `Meta: ${exercise.progression.target_reps} repetições; incremento previsto de ${exercise.progression.increment} repetição(ões).`}{' '}
              Aplique conforme a orientação recebida.
            </Text>
          </View>
        ) : null}
      </DetailsPanel>
      {p.technique ? (
        <TechniqueRunner
          exercise={exercise}
          setIndex={index}
          log={log}
          onChange={onChange}
          finalRest={rest}
          previous={previous}
        />
      ) : (
        <>
          <QuickSetEntry
            exercise={exercise}
            index={index}
            log={log}
            previous={preceding ?? previous?.log}
            onChange={onChange}
          >
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <NumericLog
                label="Carga (kg)"
                value={log.weight}
                max={2000}
                decimal
                onChange={(weight) => onChange({ weight })}
              />
              <NumericLog
                label={
                  exercise.metric === 'seconds'
                    ? 'Tempo (s)'
                    : exercise.metric === 'meters'
                      ? 'Distância (m)'
                      : 'Repetições'
                }
                value={log.reps}
                max={exercise.metric && exercise.metric !== 'reps' ? 1000000 : 1000}
                onChange={(reps) => onChange({ reps })}
              />
            </View>
          </QuickSetEntry>
          <Button
            title={log.done ? '✓ Concluída · reabrir série' : 'Concluir série'}
            variant={log.done ? 'outline' : 'primary'}
            disabled={!log.done && log.reps == null}
            onPress={() => onChange({ done: !log.done }, !log.done ? rest : undefined)}
          />
        </>
      )}
      {feedback ? (
        <EffortPicker
          value={log.actual_effort}
          title={`Esforço realizado · série ${index + 1}`}
          purpose="feedback"
          singleOnly
          onClose={() => setFeedback(false)}
          onApply={(actual_effort) => {
            onChange({ actual_effort });
            setFeedback(false);
          }}
        />
      ) : null}
    </View>
  );
}

export function TrainingSet(
  props: React.ComponentProps<typeof TrainingSetDetails> & {
    defaultOpen?: boolean;
    hasRecord?: boolean;
    onViewRecord?: () => void;
  },
) {
  const [opened, setOpened] = useState<boolean | null>(null);
  const open = opened ?? (!props.log.done && (props.defaultOpen ?? true));
  const p = seriesFor(props.exercise, props.index);
  if (!p.technique)
    return (
      <View style={{ gap: 6 }}>
        <SetTableHeader exercise={props.exercise} />
        <SetTableRow
          exercise={props.exercise}
          index={props.index}
          log={props.log}
          hasRecord={props.hasRecord}
          onViewRecord={props.onViewRecord}
          previous={props.preceding ?? props.previous?.log}
          onChange={props.onChange}
        />
      </View>
    );
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={
          'Série ' +
          (props.index + 1) +
          ', ' +
          (props.log.done ? 'concluída' : open ? 'em andamento' : 'pendente')
        }
        onPress={() => setOpened(!open)}
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 10,
          borderRadius: 10,
          backgroundColor: props.log.done ? '#26371D' : '#111A0D',
          borderWidth: 1,
          borderColor: open ? '#789A50' : '#34442C',
        }}
      >
        <Text color={props.log.done ? '#C0F568' : '#CFD9C7'} style={{ width: 26 }}>
          {props.log.done ? '✓' : props.index + 1}
        </Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 13, lineHeight: 19 }}>
            Série {props.index + 1} ·{' '}
            {props.log.done ? 'Concluída' : open ? 'Em andamento' : 'Pendente'} ·{' '}
            {kindInfo[p.kind].label}
            {p.technique ? ' / ' + techniqueInfo[p.technique.type].label : ''}
          </Text>
          <Text variant="caption" style={{ fontSize: 12 }}>
            {props.log.weight ?? '—'} kg ·{' '}
            {p.technique?.type === 'isometric'
              ? (props.log.seconds ?? '—') + ' s'
              : (props.log.reps ?? '—') + ' ' + unit(props.exercise)}
            {!props.log.done ? ' · meta ' + p.target : ''}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#AABB9C" />
      </Pressable>
      {open ? (
        <TrainingSetDetails
          {...props}
          onChange={(patch, rest) => {
            props.onChange(patch, rest);
            if (patch.done !== undefined) setOpened(null);
          }}
        />
      ) : null}
    </View>
  );
}
