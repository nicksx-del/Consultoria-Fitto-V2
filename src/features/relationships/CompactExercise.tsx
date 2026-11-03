import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import { DraftExercise, SetPrescription, effortLabel, setEffort } from './workoutModel';
import { EffortPicker } from './EffortPicker';
import { SetTechniquePicker } from './SetTechniquePicker';
import { kindInfo, techniqueInfo } from './trainingMethods';
import {
  applyWorkingPrescription,
  duplicatePrescription,
  parseQuickEffort,
} from './quickPrescription';
import { SelectedExercisePreview } from './SelectedExercisePreview';

function QuickEffort({
  value,
  mode,
  disabled,
  onCommit,
  label,
  onOptions,
}: {
  value: string;
  mode: 'rir' | 'rpe';
  disabled: boolean;
  onCommit: (value: ReturnType<typeof parseQuickEffort>) => void;
  label: string;
  onOptions: () => void;
}) {
  const [text, setText] = useState(value);
  const [error, setError] = useState('');
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: escolher escala ${mode.toUpperCase()}`}
        disabled={disabled}
        onPress={onOptions}
        style={{ alignItems: 'center', justifyContent: 'center', minHeight: 26 }}
      >
        <Text style={{ fontSize: 11, fontWeight: '600' }} color="#C0F568">
          {mode.toUpperCase()}⌄
        </Text>
      </Pressable>
      <TextInput
        accessibilityLabel={label}
        value={text}
        editable={!disabled}
        placeholder="1–2"
        placeholderTextColor="#809A6E"
        maxLength={12}
        onChangeText={(next) => {
          setText(next);
          setError('');
        }}
        onBlur={() => {
          if (text === value) return;
          try {
            onCommit(parseQuickEffort(text, mode));
            setError('');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
        style={{
          minWidth: 0,
          minHeight: 44,
          borderRadius: 8,
          backgroundColor: '#2C401F',
          color: '#C0F568',
          textAlign: 'center',
          borderWidth: 1,
          borderColor: error ? '#FFAF71' : '#607A43',
          fontSize: 14,
        }}
      />
      {error ? (
        <Text variant="caption" color="#FFAF71" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function PrescriptionRows({
  exercise: e,
  disabled,
  onChange,
  showAdvanced = false,
}: {
  showAdvanced?: boolean;
  exercise: DraftExercise;
  disabled: boolean;
  onChange: (patch: Partial<DraftExercise>) => void;
}) {
  const [editingEffort, setEditingEffort] = useState<'exercise' | number | null>(null);
  const [quickKind, setQuickKind] = useState<number | null>(null);
  const [bulk, setBulk] = useState(false);
  const [bulkTarget, setBulkTarget] = useState(e.reps || '8–12');
  const [bulkRest, setBulkRest] = useState(e.rest_seconds || '60');
  const [bulkEffort, setBulkEffort] = useState('2');
  const [bulkError, setBulkError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<number | null>(null);
  const count = Math.max(0, Math.min(20, Math.floor(Number(e.sets)) || 0));
  const rows: SetPrescription[] = Array.from(
    { length: count },
    (_, i) =>
      e.prescribed_sets?.[i] ?? {
        target: e.reps,
        load: e.load || '',
        rest: e.rest_seconds,
        kind: 'work',
      },
  );
  function patch(index: number, value: Partial<SetPrescription>) {
    onChange({ prescribed_sets: rows.map((r, i) => (i === index ? { ...r, ...value } : r)) });
  }
  const inputStyle = {
    minHeight: 42,
    minWidth: 0,
    backgroundColor: '#202B1B',
    color: '#F2F3EE',
    borderRadius: 8,
    textAlign: 'center' as const,
    fontSize: 14,
    paddingHorizontal: 4,
  };
  return (
    <View style={{ gap: 8 }}>
      {editingTechnique !== null ? (
        <SetTechniquePicker
          index={editingTechnique}
          value={rows[editingTechnique]}
          onClose={() => setEditingTechnique(null)}
          onSave={(value) => {
            patch(editingTechnique, value);
            setEditingTechnique(null);
          }}
        />
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Definir esforço padrão do exercício"
          disabled={disabled}
          onPress={() => setEditingEffort('exercise')}
          style={{ flex: 1, minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 }}
        >
          <Text style={{ fontSize: 12 }} color="#C0F568">
            {e.effort_target ? `Padrão: ${effortLabel(e.effort_target)} ⌄` : '+ Definir RIR padrão'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => setBulk(!bulk)}
          style={{ minHeight: 40, paddingHorizontal: 8, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12 }} color="#CBD8C2">
            {bulk ? 'Fechar lote' : 'Aplicar em lote'}
          </Text>
        </Pressable>
      </View>
      {editingEffort !== null ? (
        <EffortPicker
          title={
            editingEffort === 'exercise'
              ? 'Padrão deste exercício'
              : `Série ${editingEffort + 1}${rows[editingEffort]?.kind === 'warmup' ? ' · aquecimento' : ''}`
          }
          value={typeof editingEffort === 'number' ? setEffort(e, editingEffort) : e.effort_target}
          onClose={() => setEditingEffort(null)}
          onApply={(value) => {
            if (typeof editingEffort === 'number') patch(editingEffort, { effort_target: value });
            else
              onChange({
                effort_target: value,
              });
            setEditingEffort(null);
          }}
          onInherit={
            typeof editingEffort === 'number'
              ? () => {
                  patch(editingEffort, { effort_target: undefined });
                  setEditingEffort(null);
                }
              : undefined
          }
        />
      ) : null}
      {bulk ? (
        <View style={{ gap: 8, padding: 10, backgroundColor: '#25371C', borderRadius: 10 }}>
          <Text variant="caption">Repetições / alvo</Text>
          <TextInput
            accessibilityLabel="Alvo em lote"
            value={bulkTarget}
            onChangeText={setBulkTarget}
            editable={!disabled}
            maxLength={40}
            style={inputStyle}
          />
          <Text variant="caption">RIR (valor ou intervalo)</Text>
          <TextInput
            accessibilityLabel="RIR em lote"
            value={bulkEffort}
            onChangeText={setBulkEffort}
            editable={!disabled}
            maxLength={12}
            style={inputStyle}
          />
          <Text variant="caption">Descanso (s)</Text>
          <TextInput
            accessibilityLabel="Descanso em lote"
            value={bulkRest}
            onChangeText={setBulkRest}
            editable={!disabled}
            maxLength={4}
            keyboardType="number-pad"
            style={inputStyle}
          />
          <Text variant="caption">
            Atualiza as séries de trabalho, top set e back-off. Preserva aquecimento, aproximação e
            repetições das técnicas em etapas.
          </Text>
          {bulkError ? (
            <Text color="#FFAF71" accessibilityRole="alert">
              {bulkError}
            </Text>
          ) : null}
          <Button
            title="Aplicar repetições, RIR e descanso"
            disabled={disabled}
            onPress={() => {
              try {
                const prescribed_sets = applyWorkingPrescription(
                  rows,
                  bulkTarget,
                  bulkRest,
                  parseQuickEffort(bulkEffort),
                );
                onChange({ prescribed_sets });
                setBulk(false);
                setBulkError('');
              } catch (e) {
                setBulkError((e as Error).message);
              }
            }}
          />
        </View>
      ) : null}
      {showAdvanced ? (
        <Button
          title={showDetails ? 'Recolher técnicas por série' : 'Técnicas por série'}
          variant="ghost"
          onPress={() => setShowDetails(!showDetails)}
        />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Text variant="caption" style={{ width: 30, textAlign: 'center' }}>
          Nº
        </Text>
        <Text variant="caption" style={{ flex: 1, textAlign: 'center' }}>
          {e.metric === 'seconds' ? 'Tempo (s)' : e.metric === 'meters' ? 'Dist. (m)' : 'Reps'}
        </Text>
        <Text variant="caption" color="#B7F34A" style={{ flex: 1, textAlign: 'center' }}>
          Esforço
        </Text>
        <Text variant="caption" style={{ width: 56, textAlign: 'center' }}>
          Pausa (s)
        </Text>
        <View style={{ width: 32 }} />
      </View>
      {rows.map((r, i) => (
        <View key={i} style={{ gap: 4 }}>
          {quickKind === i ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(kindInfo) as SetPrescription['kind'][]).map((kind) => (
                <Button
                  key={kind}
                  title={kindInfo[kind].label}
                  variant={r.kind === kind ? 'primary' : 'outline'}
                  disabled={disabled}
                  onPress={() => {
                    patch(i, { kind });
                    setQuickKind(null);
                  }}
                />
              ))}
              <Button
                title="RIR / RPE e opções de esforço"
                variant="ghost"
                disabled={disabled}
                onPress={() => {
                  setEditingEffort(i);
                  setQuickKind(null);
                }}
              />
              <Button
                title="Duplicar esta série"
                variant="outline"
                disabled={disabled || count >= 20 || !!e.group_rule}
                onPress={() => {
                  const prescribed_sets = duplicatePrescription(rows, i);
                  onChange({ sets: String(prescribed_sets.length), prescribed_sets });
                  setQuickKind(null);
                }}
              />
            </View>
          ) : null}
          {showDetails ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Técnica e orientação da série ${i + 1}`}
                disabled={disabled}
                onPress={() => setEditingTechnique(i)}
                style={{ flex: 1, minHeight: 36, justifyContent: 'center' }}
              >
                <Text variant="caption" color="#B7D6A2">
                  {r.technique
                    ? techniqueInfo[r.technique.type].label +
                      ' · ' +
                      r.technique.steps.length +
                      ' etapas'
                    : 'Tradicional · editar técnica'}
                  {r.notes ? ' · orientação' : ''}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Série ${i + 1}: ${kindInfo[r.kind].label}. Alterar tipo`}
              disabled={disabled}
              onPress={() => setQuickKind(quickKind === i ? null : i)}
              style={{ width: 30, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                color={
                  {
                    warmup: '#FFBC72',
                    ramp: '#E6D885',
                    work: '#C1D4B4',
                    top: '#C0F568',
                    backoff: '#A6C9FF',
                  }[r.kind]
                }
              >
                {kindInfo[r.kind].badge || i + 1}
              </Text>
            </Pressable>
            <TextInput
              accessibilityLabel={`Alvo, série ${i + 1}`}
              value={r.target}
              maxLength={40}
              editable={!disabled}
              style={{ ...inputStyle, flex: 1 }}
              onChangeText={(target) => patch(i, { target })}
            />
            <QuickEffort
              key={`${i}:${JSON.stringify(setEffort(e, i))}`}
              value={setEffort(e, i) ? effortLabel(setEffort(e, i)).replace(/^(RIR|RPE) /, '') : ''}
              mode={setEffort(e, i)?.mode || 'rir'}
              disabled={disabled}
              label={`RIR ou RPE, série ${i + 1}`}
              onOptions={() => setEditingEffort(i)}
              onCommit={(effort_target) => patch(i, { effort_target })}
            />
            <TextInput
              accessibilityLabel={`Descanso em segundos, série ${i + 1}`}
              value={r.rest}
              maxLength={4}
              keyboardType="number-pad"
              editable={!disabled}
              style={{ ...inputStyle, width: 56 }}
              onChangeText={(rest) => patch(i, { rest: rest.replace(/\D/g, '') })}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover série ${i + 1}`}
              disabled={disabled || count <= 1 || !!e.group_rule}
              onPress={() =>
                onChange({
                  sets: String(count - 1),
                  prescribed_sets: rows.filter((_, n) => n !== i),
                })
              }
              style={{
                width: 32,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: count <= 1 ? 0.3 : 1,
              }}
            >
              <Ionicons name="remove-circle-outline" size={19} color="#93A485" />
            </Pressable>
          </View>
        </View>
      ))}
      <Button
        title="+ Adicionar série · copiar anterior"
        variant="outline"
        disabled={disabled || count >= 20 || !!e.group_rule}
        onPress={() =>
          onChange({
            sets: String(count + 1),
            prescribed_sets: [
              ...rows,
              {
                ...structuredClone(
                  rows[rows.length - 1] ?? {
                    target: e.reps || '8–12',
                    load: e.load || '',
                    rest: e.rest_seconds || '60',
                    kind: 'work' as const,
                  },
                ),
              },
            ],
          })
        }
      />
    </View>
  );
}
export function CompactExercise({
  exercise,
  index,
  disabled,
  onChange,
  children,
  onReplace,
  onGroup,
}: {
  exercise: DraftExercise;
  index: number;
  disabled: boolean;
  onChange: (patch: Partial<DraftExercise>) => void;
  children: React.ReactNode;
  onReplace?: () => void;
  onGroup?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View
      style={{
        gap: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#171F13',
        borderWidth: 1,
        borderColor: '#35462B',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {exercise.catalog ? (
          <SelectedExercisePreview
            key={`${exercise.catalog.provider}:${exercise.catalog.id}`}
            name={exercise.name}
            catalog={exercise.catalog}
            compact
          />
        ) : null}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: '#304425',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text color="#B7F34A" style={{ fontSize: 13 }}>
            {index + 1}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }} color="#D5F7BD">
            {exercise.name || 'Novo exercício'}
          </Text>
          <Text variant="caption">
            {exercise.muscle || 'Exercício personalizado'}
            {exercise.method && exercise.method !== 'Tradicional' ? ` · ${exercise.method}` : ''}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Opções de ${exercise.name || 'exercício'}`}
          accessibilityState={{ expanded }}
          disabled={disabled}
          onPress={() => setExpanded(!expanded)}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'ellipsis-horizontal'}
            size={24}
            color="#B7F34A"
          />
        </Pressable>
      </View>
      {expanded ? (
        <View style={{ gap: 6 }}>
          <Text variant="caption">Nota do exercício</Text>
          <TextInput
            accessibilityLabel="Nota do exercício"
            placeholder="Adicionar orientação para o aluno"
            placeholderTextColor="#74856B"
            value={exercise.notes}
            onChangeText={(notes) => onChange({ notes })}
            editable={!disabled}
            maxLength={1000}
            multiline
            style={{
              minHeight: 64,
              padding: 12,
              borderWidth: 1,
              borderColor: '#35462B',
              borderRadius: 10,
              color: '#F2F3EE',
              backgroundColor: '#202B1B',
              textAlignVertical: 'top',
              fontSize: 14,
            }}
          />
        </View>
      ) : exercise.notes ? (
        <Text variant="caption">{exercise.notes}</Text>
      ) : null}
      <PrescriptionRows
        exercise={exercise}
        disabled={disabled}
        onChange={onChange}
        showAdvanced={expanded}
      />
      {expanded ? (
        <View style={{ gap: 10 }}>
          <Text variant="caption">Nome, observações, métodos e organização</Text>
          {children}
          {onReplace ? (
            <Button
              title="Substituir exercício"
              variant="outline"
              disabled={disabled}
              onPress={onReplace}
            />
          ) : null}
          {onGroup ? (
            <Button
              title={exercise.group_rule ? 'Editar agrupamento' : 'Agrupar com outros exercícios'}
              variant="outline"
              disabled={disabled}
              onPress={onGroup}
            />
          ) : null}
          <Button title="Concluir ajustes" variant="outline" onPress={() => setExpanded(false)} />
        </View>
      ) : null}
    </View>
  );
}
