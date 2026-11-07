import Ionicons from '@expo/vector-icons/Ionicons';
import { StudentWorkoutPreview } from './StudentWorkoutPreview';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { TrainingIntake } from './TrainingIntake';
import { StudentTrainingSummary } from './StudentTrainingSummary';
import { Executions, Execution } from './Executions';
import { TrainingPlanningPanel } from './TrainingPlanningPanel';
import { ExerciseInsights } from './ExerciseInsights';
import { TrainingBlocks } from './TrainingBlocks';
import { FeedbackInbox } from './ExerciseFeedback';
import { trainingTools, TrainingFeedback } from './trainingToolsApi';
import { WorkoutPreview } from './WorkoutPreview';
import {
  Draft,
  DraftExercise,
  Plan,
  WorkoutContent,
  emptyExercise,
  issues,
  key,
  toContent,
  toDraft,
} from './workoutModel';
import { ReorderExercise } from './ReorderExercise';
import { ExerciseLibrary } from './ExerciseLibrary';
import { CompactExercise } from './CompactExercise';
import { RoutineLibrary } from './RoutineLibrary';
import { DetailsPanel } from './DetailsPanel';
import { catalogReference, muscleLabels, exerciseName } from './exerciseCatalog';
import { ExerciseGroupPicker } from './ExerciseGroupPicker';
import {
  copyPrescription,
  estimateExerciseSeconds,
  groupInfo,
  seriesFor,
  workoutDiff,
} from './trainingMethods';
import type { CatalogExercise } from './exerciseCatalog';
function StudioField({
  label,
  value,
  onChange,
  maxLength = 500,
  multiline = false,
  disabled,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  maxLength?: number;
  multiline?: boolean;
  disabled: boolean;
}) {
  return (
    <TextField
      label={label}
      value={value ?? ''}
      maxLength={maxLength}
      multiline={multiline}
      editable={!disabled}
      onChangeText={onChange}
    />
  );
}
type Recovery = {
  revision: number;
  content: {
    draft: Draft;
    plan: Pick<Plan, 'id' | 'version'> | null;
  };
  updated_at: string;
};
type Studio = {
  recovery: Recovery | null;
  templates: {
    id: string;
    name: string;
    content: WorkoutContent;
  }[];
  versions: {
    id: string;
    version: number;
    published_at: string;
    content: WorkoutContent;
  }[];
  students: {
    id: string;
    name: string;
  }[];
};
const card = {
  gap: 10,
  padding: 12,
  borderRadius: 16,
  backgroundColor: '#191E16',
  borderWidth: 1,
  borderColor: '#35432C',
} as const;
const muscles = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Quadríceps',
  'Posteriores',
  'Glúteos',
  'Panturrilhas',
  'Abdômen',
  'Corpo inteiro',
];
export function WorkoutStudio({
  profileId,
  linkId,
  onEditing,
  onBusy,
  initialPlanId,
  createNew = false,
  onLeave,
}: {
  profileId: string;
  linkId: string;
  onEditing?: (v: boolean) => void;
  onBusy?: (v: boolean) => void;
  initialPlanId?: string;
  createNew?: boolean;
  onLeave?: () => void;
}) {
  const { width } = useWindowDimensions();
  const desktopEditor = Platform.OS === 'web' && width >= 1100;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [studio, setStudio] = useState<Studio | null>(null);
  const initialOpened = useRef(false);
  const [startPrompt, setStartPrompt] = useState(false);
  const [performance, setPerformance] = useState<Execution[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState(0);
  const [advanced, setAdvanced] = useState<string | null>(null);
  const [studentPreview, setStudentPreview] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState(false);
  const [replacement, setReplacement] = useState<number | null>(null);
  const [replacementCandidate, setReplacementCandidate] = useState<{
    key: string;
    item: CatalogExercise;
  } | null>(null);
  const [groupEdit, setGroupEdit] = useState<string | null>(null);
  const [archive, setArchive] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [history, setHistory] = useState(false);
  const [context, setContext] = useState(false);
  const [results, setResults] = useState(false);
  const [undo, setUndo] = useState<Draft | null>(null);
  const [batchSets, setBatchSets] = useState('3');
  const [batchRest, setBatchRest] = useState('60');
  const [checked, setChecked] = useState<string[]>([]);
  const current = useRef<Recovery['content'] | null>(null);
  const revision = useRef(0);
  const pending = useRef(false);
  const flight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheKey = `fitto-studio-v1:${profileId}:${linkId}`;
  function cache(value: Recovery['content']) {
    if (Platform.OS === 'web')
      try {
        localStorage.setItem(cacheKey, JSON.stringify(value));
      } catch {
        /* Cloud save still protects drafts. */
      }
  }
  function cached(): Recovery['content'] | null {
    if (Platform.OS !== 'web') return null;
    try {
      return JSON.parse(localStorage.getItem(cacheKey) ?? 'null');
    } catch {
      return null;
    }
  }
  async function rpc<T>(name: string, action: string, payload: object = {}): Promise<T> {
    const { data, error: failure } = await supabase.rpc(name, {
      action,
      profile_id: profileId,
      link_id: linkId,
      payload,
    });
    if (failure)
      throw new Error(
        failure.code === 'P0001'
          ? failure.message
          : 'Falha de conexão. Suas alterações locais foram mantidas. Tente novamente.',
      );
    return data as T;
  }
  async function load() {
    const [p, s, executions, tools] = await Promise.all([
      rpc<Plan[]>('workout_api', 'list'),
      rpc<Studio>('workout_studio_api', 'read'),
      rpc<Execution[]>('execution_api', 'list'),
      trainingTools<{ feedback: TrainingFeedback[] }>(profileId, linkId, 'read'),
    ]);
    setPerformance(
      executions.map((row) => ({
        ...row,
        feedback: tools.feedback.filter((f) => f.execution_id === row.id),
        snapshot: {
          ...row.snapshot,
          session: {
            ...row.snapshot.session,
            exercises: row.snapshot.session.exercises.map((e, i) => {
              const chosen = tools.feedback.find(
                (f) => f.execution_id === row.id && f.exercise_index === i,
              )?.alternative;
              const alt = e.approved_alternatives?.find((a) => a.name === chosen);
              return alt ? { ...e, name: alt.name, catalog: alt.catalog } : e;
            }),
          },
        },
      })),
    );
    setPlans(p);
    setStudio(s);
    revision.current = s.recovery?.revision ?? 0;
  }
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // The workspace is keyed by relationship by its parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, linkId]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !draft) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current || flight.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);
  async function persist(): Promise<void> {
    if (flight.current) {
      await flight.current;
      if (pending.current) return persist();
      return;
    }
    const work = async () => {
      while (pending.current && current.current) {
        const content = current.current;
        pending.current = false;
        setSaveStatus('Salvando rascunho…');
        try {
          const rec = await rpc<Recovery>('workout_studio_api', 'recover', {
            revision: revision.current,
            content,
          });
          revision.current = rec.revision;
          setStudio((s) => (s ? { ...s, recovery: rec } : s));
        } catch (e) {
          pending.current = true;
          setSaveStatus('Falha na nuvem · cópia local mantida');
          throw e;
        }
      }
      setSaveStatus('Rascunho salvo na nuvem');
    };
    const promise = work();
    flight.current = promise;
    try {
      await promise;
    } finally {
      flight.current = null;
    }
  }
  function schedule(value: Recovery['content']) {
    current.current = value;
    cache(value);
    pending.current = true;
    setSaveStatus('Alterações locais salvas · sincronizando…');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist().catch((e) => setError(e.message));
    }, 800);
  }
  function open(content?: WorkoutContent, plan: Plan | null = null) {
    const d = toDraft(content);
    setDraft(d);
    current.current = { draft: d, plan };
    setSelected(0);
    setReviewing(false);
    setPublishing(false);
    setUndo(null);
    setChecked([]);
    setError('');
    onEditing?.(true);
    schedule({ draft: d, plan: plan ? { id: plan.id, version: plan.version } : null });
  }
  function resume(local: boolean) {
    const value = local ? cached() : studio?.recovery?.content;
    if (!value?.draft?.sessions?.length) {
      setError('Não há rascunho recuperável.');
      return;
    }
    current.current = value;
    setDraft(value.draft);
    setSelected(0);
    onEditing?.(true);
    schedule(value);
  }
  useEffect(() => {
    if (!studio || initialOpened.current || (!initialPlanId && !createNew)) return;
    void Promise.resolve().then(() => {
      if (initialOpened.current) return;
      initialOpened.current = true;
      if (createNew) {
        if (studio.recovery) setStartPrompt(true);
        else open();
      } else {
        const p = plans.find((p) => p.id === initialPlanId && p.status !== 'archived');
        if (p) {
          if (studio.recovery?.content.plan?.id === p.id) resume(false);
          else open(p.draft, p);
        } else setError('Esta ficha não está disponível para edição. Atualize os treinos.');
      }
    });
    // An explicit action from the workout menu opens the editor once after loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio, plans, initialPlanId, createNew]);
  function change(fn: (d: Draft) => Draft, removable = false) {
    if (!current.current || busy) return;
    if (removable) setUndo(current.current.draft);
    else setUndo(null);
    const next = fn(current.current.draft);
    setDraft(next);
    schedule({ ...current.current, draft: next });
    setPublishing(false);
  }
  function session(fn: (s: Draft['sessions'][number]) => Draft['sessions'][number]) {
    change((d) => ({ ...d, sessions: d.sessions.map((s, i) => (i === selected ? fn(s) : s)) }));
  }
  function exercise(index: number, patch: Partial<DraftExercise>) {
    session((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  }
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    onBusy?.(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  async function savePlan(): Promise<Plan> {
    if (!current.current) throw new Error('Abra uma ficha.');
    const problems = issues(current.current.draft, false);
    if (problems.length) throw new Error(problems.join('\n'));
    await persist();
    const { draft: d, plan } = current.current;
    const saved = await rpc<Plan>('workout_api', 'save', {
      ...(plan ? { id: plan.id, version: plan.version } : {}),
      content: toContent(d),
    });
    setPlans((rows) => [saved, ...rows.filter((x) => x.id !== saved.id)]);
    current.current = { draft: d, plan: { id: saved.id, version: saved.version } };
    cache(current.current);
    pending.current = true;
    await persist();
    return saved;
  }
  async function leave() {
    await persist();
    setDraft(null);
    current.current = null;
    setReviewing(false);
    setPublishing(false);
    onEditing?.(false);
    onLeave?.();
  }
  function reviewDraft() {
    setReviewing(true);
    setPublishing(false);
    onEditing?.(true);
  }
  const activeSession = draft?.sessions[selected];
  const validation = draft ? issues(draft, true) : [];
  if (startPrompt)
    return (
      <View style={{ ...card, gap: 14 }}>
        <Text variant="title">Você tem um rascunho salvo</Text>
        <Text>
          Deseja continuar o que estava montando ou começar outra ficha? Começar outra ficha
          substitui a recuperação automática anterior.
        </Text>
        <Button
          title="Continuar rascunho salvo"
          onPress={() => {
            setStartPrompt(false);
            resume(false);
          }}
        />
        <Button
          title="Começar outra ficha"
          variant="outline"
          onPress={() => {
            setStartPrompt(false);
            open();
          }}
        />
        <Button title="Voltar às opções de treino" variant="ghost" onPress={() => onLeave?.()} />
      </View>
    );
  const studentContext = (
    <DetailsPanel title="Consultar aluno e histórico">
      <FeedbackInbox profileId={profileId} linkId={linkId} />
      <DetailsPanel title="Perfil e disponibilidade do aluno">
        <View style={card}>
          <Text variant="title">Contexto do aluno</Text>
          <StudentTrainingSummary profileId={profileId} linkId={linkId} />
          <Text>
            Consulte objetivo, experiência, disponibilidade, equipamentos e preferências antes de
            prescrever.
          </Text>
          <Button
            title={context ? 'Recolher ficha do aluno' : 'Consultar ficha completa'}
            variant="outline"
            onPress={() => setContext(!context)}
          />
          {context ? <TrainingIntake profileId={profileId} linkId={linkId} /> : null}
          <Text variant="caption">
            Ficha atual:{' '}
            {plans.find((p) => p.status === 'published')?.published?.title ?? 'Nenhuma publicada'}
          </Text>
        </View>
      </DetailsPanel>
      <Button
        title={
          results
            ? 'Recolher resultados anteriores'
            : 'Consultar cargas, frequência e feedback anteriores'
        }
        variant="outline"
        onPress={() => setResults(!results)}
      />
      {results ? <Executions profileId={profileId} linkId={linkId} trainer /> : null}
    </DetailsPanel>
  );
  return (
    <View style={{ gap: 10, paddingBottom: draft ? 82 : 0 }}>
      <View
        style={{
          ...(draft && Platform.OS === 'web'
            ? ({ position: 'sticky', top: 0, zIndex: 20 } as unknown as ViewStyle)
            : {}),
          backgroundColor: '#10120F',
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderColor: '#35432D',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {draft ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar e manter rascunho"
            disabled={busy}
            onPress={() => void run(leave)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#24321B',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#C0F568" />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '700' }}>
            {draft ? draft.title || 'Nova prescrição' : 'Treinos do aluno'}
          </Text>
          {draft ? (
            <Text
              numberOfLines={2}
              style={{ fontSize: 11 }}
              color="#A8B59E"
              accessibilityLiveRegion="polite"
            >
              {saveStatus}
            </Text>
          ) : null}
        </View>
      </View>

      {studentPreview && draft ? (
        <Modal visible animationType="slide" onRequestClose={() => setStudentPreview(false)}>
          <ScrollView
            style={{ flex: 1, backgroundColor: '#10150D' }}
            contentContainerStyle={{ padding: 20 }}
          >
            <View style={{ maxWidth: 430, width: '100%', alignSelf: 'center', gap: 14 }}>
              <Button
                title="Voltar à prescrição"
                variant="outline"
                onPress={() => setStudentPreview(false)}
              />
              <Text variant="title">Prévia da ficha do aluno</Text>
              <Text variant="caption">
                Confira séries, tipos, técnicas e esforço antes de publicar.
              </Text>
              <StudentWorkoutPreview content={toContent(draft)} />
            </View>
          </ScrollView>
        </Modal>
      ) : null}

      {draft && !reviewing ? (
        <View
          style={{
            ...(Platform.OS === 'web'
              ? ({ position: 'fixed', bottom: 0, left: 0, right: 0 } as unknown as ViewStyle)
              : {}),
            zIndex: 25,
            backgroundColor: '#172012',
            borderTopWidth: 1,
            borderColor: '#405333',
            padding: 8,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 1240,
              alignSelf: 'center',
              flexDirection: 'row',
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                title="+ Exercício"
                variant="outline"
                disabled={busy || !activeSession || activeSession.exercises.length >= 40}
                onPress={() => setLibrary(true)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Revisar" disabled={busy} onPress={reviewDraft} />
            </View>
          </View>
        </View>
      ) : null}
      {library && activeSession ? (
        <ExerciseLibrary
          profileId={profileId}
          remaining={replacement === null ? 40 - activeSession.exercises.length : 1}
          single={replacement !== null}
          existingIds={activeSession.exercises.flatMap((e, i) =>
            e.catalog && i !== replacement ? [e.catalog.id] : [],
          )}
          onClose={() => {
            setLibrary(false);
            setReplacement(null);
          }}
          onAdd={(items) => {
            if (replacement !== null && items[0]) {
              setReplacementCandidate({
                key: activeSession.exercises[replacement].key,
                item: items[0],
              });
              setReplacement(null);
              setLibrary(false);
              return;
            }
            session((s) => ({
              ...s,
              exercises: [
                ...s.exercises,
                ...items.slice(0, 40 - s.exercises.length).map((item) => ({
                  ...emptyExercise(),
                  name: exerciseName(item),
                  muscle: muscleLabels[item.primaryMuscles[0]] || '',
                  catalog: catalogReference(item),
                })),
              ],
            }));
            setLibrary(false);
          }}
        />
      ) : null}
      {replacementCandidate ? (
        <Modal visible transparent onRequestClose={() => setReplacementCandidate(null)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: 24,
              backgroundColor: 'rgba(0,0,0,0.8)',
            }}
          >
            <View style={{ ...card, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
              <Text variant="title">Confirmar substituição</Text>
              <Text>Novo exercício: {exerciseName(replacementCandidate.item)}</Text>
              <Text>
                Séries, carga, RIR e técnicas serão mantidos. Confira se a prescrição é adequada ao
                novo movimento antes de publicar.
              </Text>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setReplacementCandidate(null)}
              />
              <Button
                title="Substituir e revisar prescrição"
                onPress={() => {
                  const { key: exerciseKey, item } = replacementCandidate;
                  session((s) => ({
                    ...s,
                    exercises: s.exercises.map((e) =>
                      e.key === exerciseKey
                        ? {
                            ...e,
                            name: exerciseName(item),
                            muscle: muscleLabels[item.primaryMuscles[0]] || '',
                            catalog: catalogReference(item),
                          }
                        : e,
                    ),
                  }));
                  setReplacementCandidate(null);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
      {groupEdit !== null && activeSession ? (
        <ExerciseGroupPicker
          exercises={activeSession.exercises}
          currentId={groupEdit || undefined}
          onClose={() => setGroupEdit(null)}
          onApply={(keys, rule) => {
            const id = groupEdit || key();
            session((s) => ({
              ...s,
              exercises: s.exercises.map((e) =>
                keys.includes(e.key) && rule
                  ? {
                      ...e,
                      group_rule: { id, ...rule },
                      method: groupInfo[rule.type].label,
                      group: id,
                      sets: String(rule.rounds),
                      prescribed_sets: Array.from({ length: rule.rounds }, (_, i) =>
                        structuredClone(seriesFor(e, Math.min(i, Number(e.sets) - 1))),
                      ),
                    }
                  : e.group_rule?.id === id
                    ? { ...e, group_rule: undefined, method: 'Tradicional', group: undefined }
                    : e,
              ),
            }));
            setGroupEdit(null);
          }}
        />
      ) : null}
      {archive ? (
        <View style={card}>
          <Text>
            Arquivar “{archive.draft.title}”? Se estiver publicada, ela deixará de ser a ficha
            atual. O histórico será mantido.
          </Text>
          <Button
            title="Manter ficha"
            variant="outline"
            disabled={busy}
            onPress={() => setArchive(null)}
          />
          <Button
            title="Confirmar arquivamento"
            loading={busy}
            onPress={() =>
              void run(async () => {
                await rpc('workout_api', 'archive', { id: archive.id, version: archive.version });
                setArchive(null);
                await load();
              })
            }
          />
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityRole="alert" color="#D3FB69">
          {notice}
        </Text>
      ) : null}
      {!studio ? (
        <Button title="Carregar área de treinos" onPress={() => void run(load)} disabled={busy} />
      ) : (
        <>
          {!draft || reviewing ? studentContext : null}
          {draft ? (
            <>
              {error ? (
                <Button
                  title="Sincronizar rascunho agora"
                  variant="outline"
                  disabled={busy}
                  onPress={() => void run(persist)}
                />
              ) : null}
              {reviewing ? (
                <>
                  <Text variant="heading">Revisão antes de publicar</Text>
                  <View style={card}>
                    <Text variant="title">O que vai mudar</Text>
                    {workoutDiff(
                      plans.find((p) => p.status === 'published')?.published,
                      toContent(draft),
                    ).map((change, i) => (
                      <Text key={i}>• {change}</Text>
                    ))}
                  </View>
                  {validation.map((v, i) => (
                    <Text key={i} color="#FFAF71">
                      {v}
                    </Text>
                  ))}
                  <WorkoutPreview content={toContent(draft)} />
                  <View style={card}>
                    <Text variant="title">Resumo de volume e duração</Text>
                    <Text variant="caption">
                      Estimativa: 40s por série de repetições, alvos de tempo quando numéricos,
                      descanso prescrito e 2 min de transição por exercício. Não inclui deslocamento
                      entre aparelhos.
                    </Text>
                    {draft.sessions.map((s, i) => {
                      const volume: Record<string, number> = {};
                      let seconds = 0;
                      s.exercises.forEach((e) => {
                        volume[e.muscle || 'Não classificado'] =
                          (volume[e.muscle || 'Não classificado'] ?? 0) + Number(e.sets);
                        seconds += estimateExerciseSeconds(e, s.exercises);
                      });
                      return (
                        <View key={i} style={{ gap: 4 }}>
                          <Text>
                            {s.name}: cerca de {Math.round(seconds / 60)} min · {s.exercises.length}{' '}
                            exercícios
                          </Text>
                          {Object.entries(volume).map(([muscle, count]) => (
                            <Text key={muscle} variant="caption">
                              {muscle}: {count} séries (inclui aquecimento)
                            </Text>
                          ))}
                          {seconds > 5400 ? (
                            <Text color="#FFAF71">
                              Sessão estimada acima de 90 minutos. Confira a disponibilidade do
                              aluno.
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                  <Button
                    title="Voltar à edição"
                    disabled={busy}
                    onPress={() => {
                      setReviewing(false);
                      setPublishing(false);
                      onEditing?.(true);
                    }}
                  />
                  {!publishing ? (
                    <Button
                      title="Publicar para este aluno"
                      disabled={busy || validation.length > 0}
                      onPress={() => setPublishing(true)}
                    />
                  ) : (
                    <View style={card}>
                      <Text>
                        A ficha “{draft.title}” passará a ser a atual. A ficha anterior será
                        arquivada e as execuções iniciadas manterão a prescrição original.
                      </Text>
                      <Button
                        title="Confirmar publicação"
                        loading={busy}
                        onPress={() =>
                          void run(async () => {
                            const plan = await savePlan();
                            await rpc('workout_api', 'publish', {
                              id: plan.id,
                              version: plan.version,
                            });
                            await rpc('workout_studio_api', 'clear', {
                              revision: revision.current,
                            });
                            revision.current = 0;
                            if (Platform.OS === 'web') localStorage.removeItem(cacheKey);
                            pending.current = false;
                            setDraft(null);
                            current.current = null;
                            onEditing?.(false);
                            await load();
                            setNotice('Ficha publicada para o aluno.');
                          })
                        }
                      />
                    </View>
                  )}
                </>
              ) : (
                <>
                  <DetailsPanel title="Dados e planejamento">
                    <View style={card}>
                      {studentContext}
                      {
                        <StudioField
                          label={'Nome da ficha'}
                          value={draft.title}
                          onChange={(title) => change((d) => ({ ...d, title }))}
                          maxLength={100}
                          disabled={busy}
                        />
                      }
                      <TrainingPlanningPanel
                        draft={draft}
                        disabled={busy}
                        onChange={(next) => change(() => next)}
                      />
                      <DetailsPanel title="Objetivo, datas e orientações">
                        {
                          <StudioField
                            label={'Objetivo do ciclo'}
                            value={draft.goal}
                            onChange={(goal) => change((d) => ({ ...d, goal }))}
                            disabled={busy}
                          />
                        }
                        {
                          <StudioField
                            label={'Início (AAAA-MM-DD, opcional)'}
                            value={draft.starts}
                            onChange={(starts) => change((d) => ({ ...d, starts }))}
                            maxLength={10}
                            disabled={busy}
                          />
                        }
                        {
                          <StudioField
                            label={'Revisão prevista (AAAA-MM-DD, opcional)'}
                            value={draft.review}
                            onChange={(review) => change((d) => ({ ...d, review }))}
                            maxLength={10}
                            disabled={busy}
                          />
                        }
                        {
                          <StudioField
                            label={'Orientações gerais'}
                            value={draft.notes}
                            onChange={(notes) => change((d) => ({ ...d, notes }))}
                            maxLength={1000}
                            multiline={true}
                            disabled={busy}
                          />
                        }
                      </DetailsPanel>
                    </View>
                  </DetailsPanel>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                    accessibilityLabel="Divisões do treino"
                  >
                    {draft.sessions.map((division, index) => (
                      <Pressable
                        key={division.key}
                        accessibilityRole="tab"
                        accessibilityLabel={division.name || 'Divisão ' + (index + 1)}
                        accessibilityState={{ selected: selected === index, disabled: busy }}
                        disabled={busy}
                        onPress={() => {
                          setSelected(index);
                          setChecked([]);
                        }}
                        style={{
                          minHeight: 44,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: selected === index ? '#789B4C' : '#34432B',
                          backgroundColor: selected === index ? '#314525' : '#192114',
                        }}
                      >
                        <Text
                          style={{ fontSize: 13, fontWeight: '600' }}
                          color={selected === index ? '#C0F568' : '#B6C4AC'}
                        >
                          {division.name || 'Divisão ' + (index + 1)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  {activeSession ? (
                    <View
                      style={{
                        flexDirection: desktopEditor ? 'row' : 'column',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <View
                        style={{
                          ...card,
                          flex: 1,
                          minWidth: 0,
                          width: desktopEditor ? undefined : '100%',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 8,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text variant="caption">{activeSession.exercises.length} exercícios</Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Ver como aluno"
                            disabled={busy}
                            onPress={() => setStudentPreview(true)}
                            style={{
                              minHeight: 44,
                              flexDirection: 'row',
                              gap: 6,
                              alignItems: 'center',
                              paddingHorizontal: 8,
                            }}
                          >
                            <Ionicons name="eye-outline" size={17} color="#C0F568" />
                            <Text style={{ fontSize: 12 }} color="#C0F568">
                              Prévia
                            </Text>
                          </Pressable>
                        </View>
                        <DetailsPanel title="Configurar divisão">
                          <Button
                            title="Criar supersérie, bi-set ou circuito"
                            disabled={busy || activeSession.exercises.length < 2}
                            onPress={() => setGroupEdit('')}
                          />
                          {
                            <StudioField
                              label={'Nome da divisão'}
                              value={activeSession.name}
                              onChange={(name) => session((s) => ({ ...s, name }))}
                              maxLength={80}
                              disabled={busy}
                            />
                          }
                          {
                            <StudioField
                              label={'Dias / frequência sugerida (opcional)'}
                              value={activeSession.days}
                              onChange={(days) => session((s) => ({ ...s, days }))}
                              maxLength={100}
                              disabled={busy}
                            />
                          }
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <Button
                              title="Subir divisão"
                              variant="ghost"
                              disabled={busy || selected === 0}
                              onPress={() => {
                                change((d) => {
                                  const sessions = [...d.sessions];
                                  [sessions[selected - 1], sessions[selected]] = [
                                    sessions[selected],
                                    sessions[selected - 1],
                                  ];
                                  return { ...d, sessions };
                                });
                                setSelected(selected - 1);
                              }}
                            />
                            <Button
                              title="Descer divisão"
                              variant="ghost"
                              disabled={busy || selected === draft.sessions.length - 1}
                              onPress={() => {
                                change((d) => {
                                  const sessions = [...d.sessions];
                                  [sessions[selected + 1], sessions[selected]] = [
                                    sessions[selected],
                                    sessions[selected + 1],
                                  ];
                                  return { ...d, sessions };
                                });
                                setSelected(selected + 1);
                              }}
                            />
                            <Button
                              title="Duplicar divisão"
                              variant="outline"
                              disabled={busy || draft.sessions.length >= 12}
                              onPress={() =>
                                change((d) => ({
                                  ...d,
                                  sessions: [
                                    ...d.sessions,
                                    {
                                      ...activeSession,
                                      key: key(),
                                      name: `${activeSession.name} (cópia)`.slice(0, 80),
                                      exercises: activeSession.exercises.map((e) => ({
                                        ...structuredClone(e),
                                        key: key(),
                                      })),
                                    },
                                  ],
                                }))
                              }
                            />
                            <Button
                              title="Remover divisão"
                              variant="ghost"
                              disabled={busy || draft.sessions.length === 1}
                              onPress={() => {
                                change(
                                  (d) => ({
                                    ...d,
                                    sessions: d.sessions.filter((_, i) => i !== selected),
                                  }),
                                  true,
                                );
                                setSelected(0);
                                setChecked([]);
                              }}
                            />
                          </View>
                          <TrainingBlocks
                            profileId={profileId}
                            linkId={linkId}
                            exercises={activeSession.exercises}
                            disabled={busy}
                            onInsert={(items) =>
                              session((s) => ({ ...s, exercises: [...s.exercises, ...items] }))
                            }
                          />
                        </DetailsPanel>
                        {activeSession.exercises.map((e, i) => (
                          <ReorderExercise
                            key={e.key}
                            index={i}
                            disabled={busy}
                            onMove={(from, to) =>
                              session((s) => {
                                const exercises = [...s.exercises];
                                if (
                                  from < 0 ||
                                  from >= exercises.length ||
                                  to < 0 ||
                                  to >= exercises.length
                                )
                                  return s;
                                const [moving] = exercises.splice(from, 1);
                                exercises.splice(to, 0, moving);
                                return { ...s, exercises };
                              })
                            }
                          >
                            <CompactExercise
                              exercise={e}
                              index={i}
                              disabled={busy}
                              onReplace={() => {
                                setReplacement(i);
                                setLibrary(true);
                              }}
                              onGroup={() => setGroupEdit(e.group_rule?.id || '')}
                              onChange={(patch) => exercise(i, patch)}
                            >
                              <ExerciseInsights
                                profileId={profileId}
                                exercise={e}
                                history={performance}
                                disabled={busy}
                                onChange={(patch) => exercise(i, patch)}
                              />
                              <View style={{ ...card, backgroundColor: '#252D1E' }}>
                                <Text variant="title">
                                  {i + 1}. {e.name || 'Novo exercício'}
                                </Text>
                                <Button
                                  title={
                                    checked.includes(e.key)
                                      ? 'Selecionado para edição em lote'
                                      : 'Selecionar para edição em lote'
                                  }
                                  variant="ghost"
                                  disabled={busy}
                                  onPress={() =>
                                    setChecked((items) =>
                                      items.includes(e.key)
                                        ? items.filter((x) => x !== e.key)
                                        : [...items, e.key],
                                    )
                                  }
                                />
                                {
                                  <StudioField
                                    label={'Nome do exercício'}
                                    value={e.name}
                                    onChange={(name) => exercise(i, { name })}
                                    maxLength={120}
                                    disabled={busy}
                                  />
                                }
                                {
                                  <StudioField
                                    label={'Séries (1 a 20)'}
                                    value={e.sets}
                                    onChange={(sets) =>
                                      exercise(i, { sets, prescribed_sets: undefined })
                                    }
                                    maxLength={2}
                                    disabled={busy}
                                  />
                                }
                                {
                                  <StudioField
                                    label={'Alvo por série (repetições, segundos ou metros)'}
                                    value={e.reps}
                                    onChange={(reps) => exercise(i, { reps })}
                                    maxLength={40}
                                    disabled={busy}
                                  />
                                }
                                {
                                  <StudioField
                                    label={'Descanso em segundos'}
                                    value={e.rest_seconds}
                                    onChange={(rest_seconds) => exercise(i, { rest_seconds })}
                                    maxLength={4}
                                    disabled={busy}
                                  />
                                }
                                {
                                  <StudioField
                                    label={'Carga orientada (opcional)'}
                                    value={e.load}
                                    onChange={(load) => exercise(i, { load })}
                                    maxLength={100}
                                    disabled={busy}
                                  />
                                }
                                {
                                  <StudioField
                                    label={'Observações'}
                                    value={e.notes}
                                    onChange={(notes) => exercise(i, { notes })}
                                    maxLength={500}
                                    multiline={true}
                                    disabled={busy}
                                  />
                                }
                                <Button
                                  title={
                                    advanced === e.key
                                      ? 'Recolher opções avançadas'
                                      : 'Opções avançadas e séries individuais'
                                  }
                                  variant="outline"
                                  disabled={busy}
                                  onPress={() => setAdvanced(advanced === e.key ? null : e.key)}
                                />
                                {advanced === e.key ? (
                                  <>
                                    <Text variant="caption">
                                      RIR = repetições que sobrariam. RPE = esforço percebido
                                      (1–10). Defina a meta nos controles do cartão. Use o campo
                                      abaixo apenas para complementar.
                                    </Text>
                                    {
                                      <StudioField
                                        label={'Orientação complementar de esforço (opcional)'}
                                        value={e.effort}
                                        onChange={(effort) => exercise(i, { effort })}
                                        maxLength={100}
                                        disabled={busy}
                                      />
                                    }
                                    {
                                      <StudioField
                                        label={'Cadência (ex.: 3s descida / 1s subida)'}
                                        value={e.cadence}
                                        onChange={(cadence) => exercise(i, { cadence })}
                                        maxLength={100}
                                        disabled={busy}
                                      />
                                    }
                                    <Text>Tipo de registro</Text>
                                    <View
                                      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
                                    >
                                      {(['reps', 'seconds', 'meters'] as const).map((metric) => (
                                        <Button
                                          key={metric}
                                          title={
                                            metric === 'reps'
                                              ? 'Repetições'
                                              : metric === 'seconds'
                                                ? 'Tempo (s)'
                                                : 'Distância (m)'
                                          }
                                          variant={
                                            (e.metric ?? 'reps') === metric ? 'primary' : 'outline'
                                          }
                                          disabled={busy}
                                          onPress={() => exercise(i, { metric })}
                                        />
                                      ))}
                                    </View>
                                    <Text>Grupo muscular principal</Text>
                                    <View
                                      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
                                    >
                                      {muscles.map((muscle) => (
                                        <Button
                                          key={muscle}
                                          title={muscle}
                                          variant={e.muscle === muscle ? 'primary' : 'outline'}
                                          disabled={busy}
                                          onPress={() => exercise(i, { muscle })}
                                        />
                                      ))}
                                    </View>
                                    {
                                      <StudioField
                                        label={'Alternativas autorizadas'}
                                        value={e.alternatives}
                                        onChange={(alternatives) => exercise(i, { alternatives })}
                                        maxLength={500}
                                        multiline={true}
                                        disabled={busy}
                                      />
                                    }
                                    {
                                      <StudioField
                                        label={'Vídeo demonstrativo (link HTTPS)'}
                                        value={e.video}
                                        onChange={(video) => exercise(i, { video })}
                                        maxLength={500}
                                        disabled={busy}
                                      />
                                    }
                                    <Text>Método de execução</Text>
                                    <View
                                      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
                                    >
                                      {
                                        <Button
                                          title="Configurar supersérie, bi-set ou circuito"
                                          variant="outline"
                                          onPress={() => setGroupEdit(e.group_rule?.id || String())}
                                        />
                                      }
                                    </View>
                                    {!e.group_rule && e.method && e.method !== 'Tradicional' ? (
                                      <>
                                        {
                                          <StudioField
                                            label={'Identificador do grupo (ex.: S1)'}
                                            value={e.group}
                                            onChange={(group) => exercise(i, { group })}
                                            maxLength={40}
                                            disabled={busy}
                                          />
                                        }
                                        <Text variant="caption">
                                          Use o mesmo grupo nos exercícios combinados. Defina
                                          sequência, reduções de carga e descanso nas observações e
                                          séries individuais.
                                        </Text>
                                      </>
                                    ) : null}
                                    {!e.prescribed_sets ? (
                                      <Button
                                        title="Personalizar cada série / aquecimento"
                                        disabled={
                                          busy ||
                                          !/^\d+$/.test(e.sets) ||
                                          Number(e.sets) < 1 ||
                                          Number(e.sets) > 20
                                        }
                                        onPress={() =>
                                          exercise(i, {
                                            prescribed_sets: Array.from(
                                              { length: Number(e.sets) },
                                              () => ({
                                                target: e.reps,
                                                load: e.load || '',
                                                rest: e.rest_seconds,
                                                kind: 'work' as const,
                                              }),
                                            ),
                                          })
                                        }
                                      />
                                    ) : (
                                      <>
                                        <Text variant="caption">
                                          As séries de aquecimento fazem parte do total de séries
                                          acima.
                                        </Text>
                                        {e.prescribed_sets.map((p, n) => {
                                          const patch = (value: Partial<typeof p>) =>
                                            exercise(i, {
                                              prescribed_sets: e.prescribed_sets!.map((x, j) =>
                                                j === n ? { ...x, ...value } : x,
                                              ),
                                            });
                                          return (
                                            <View
                                              key={n}
                                              style={{
                                                gap: 8,
                                                padding: 10,
                                                borderWidth: 1,
                                                borderColor: '#536345',
                                                borderRadius: 10,
                                              }}
                                            >
                                              <Text>Série {n + 1}</Text>
                                              <Button
                                                title={
                                                  p.kind === 'warmup'
                                                    ? 'Aquecimento'
                                                    : 'Série de trabalho'
                                                }
                                                variant="outline"
                                                disabled={busy}
                                                onPress={() =>
                                                  patch({
                                                    kind: p.kind === 'warmup' ? 'work' : 'warmup',
                                                  })
                                                }
                                              />
                                              {
                                                <StudioField
                                                  label={'Alvo desta série'}
                                                  value={p.target}
                                                  onChange={(target) => patch({ target })}
                                                  maxLength={40}
                                                  disabled={busy}
                                                />
                                              }
                                              {
                                                <StudioField
                                                  label={'Carga desta série'}
                                                  value={p.load}
                                                  onChange={(load) => patch({ load })}
                                                  maxLength={100}
                                                  disabled={busy}
                                                />
                                              }
                                              {
                                                <StudioField
                                                  label={'Descanso desta série (s)'}
                                                  value={p.rest}
                                                  onChange={(rest) => patch({ rest })}
                                                  maxLength={4}
                                                  disabled={busy}
                                                />
                                              }
                                            </View>
                                          );
                                        })}
                                        <Button
                                          title="Voltar à prescrição igual para todas as séries"
                                          variant="ghost"
                                          disabled={busy}
                                          onPress={() =>
                                            exercise(i, { prescribed_sets: undefined })
                                          }
                                        />
                                      </>
                                    )}
                                  </>
                                ) : null}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                  <Button
                                    title="Subir"
                                    variant="ghost"
                                    disabled={busy || i === 0}
                                    onPress={() =>
                                      session((s) => {
                                        const exercises = [...s.exercises];
                                        [exercises[i - 1], exercises[i]] = [
                                          exercises[i],
                                          exercises[i - 1],
                                        ];
                                        return { ...s, exercises };
                                      })
                                    }
                                  />
                                  <Button
                                    title="Descer"
                                    variant="ghost"
                                    disabled={busy || i === activeSession.exercises.length - 1}
                                    onPress={() =>
                                      session((s) => {
                                        const exercises = [...s.exercises];
                                        [exercises[i + 1], exercises[i]] = [
                                          exercises[i],
                                          exercises[i + 1],
                                        ];
                                        return { ...s, exercises };
                                      })
                                    }
                                  />
                                  <Button
                                    title="Duplicar exercício"
                                    variant="outline"
                                    disabled={busy || activeSession.exercises.length >= 40}
                                    onPress={() =>
                                      session((s) => ({
                                        ...s,
                                        exercises: [
                                          ...s.exercises,
                                          { ...structuredClone(e), key: key() },
                                        ],
                                      }))
                                    }
                                  />
                                  <Button
                                    title="Remover"
                                    variant="ghost"
                                    disabled={busy}
                                    onPress={() =>
                                      change(
                                        (d) => ({
                                          ...d,
                                          sessions: d.sessions.map((s, n) =>
                                            n === selected
                                              ? {
                                                  ...s,
                                                  exercises: s.exercises.filter((_, j) => j !== i),
                                                }
                                              : s,
                                          ),
                                        }),
                                        true,
                                      )
                                    }
                                  />
                                </View>
                                {draft.sessions
                                  .filter((s) => s.key !== activeSession.key)
                                  .map((target) => (
                                    <View
                                      key={target.key}
                                      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
                                    >
                                      <Button
                                        title={`Copiar para ${target.name}`}
                                        variant="ghost"
                                        disabled={busy || target.exercises.length >= 40}
                                        onPress={() =>
                                          change((d) => ({
                                            ...d,
                                            sessions: d.sessions.map((s) =>
                                              s.key === target.key
                                                ? {
                                                    ...s,
                                                    exercises: [
                                                      ...s.exercises,
                                                      { ...structuredClone(e), key: key() },
                                                    ],
                                                  }
                                                : s,
                                            ),
                                          }))
                                        }
                                      />
                                      <Button
                                        title={`Mover para ${target.name}`}
                                        variant="ghost"
                                        disabled={busy || target.exercises.length >= 40}
                                        onPress={() =>
                                          change(
                                            (d) => ({
                                              ...d,
                                              sessions: d.sessions.map((s) =>
                                                s.key === target.key
                                                  ? { ...s, exercises: [...s.exercises, e] }
                                                  : s.key === activeSession.key
                                                    ? {
                                                        ...s,
                                                        exercises: s.exercises.filter(
                                                          (x) => x.key !== e.key,
                                                        ),
                                                      }
                                                    : s,
                                              ),
                                            }),
                                            true,
                                          )
                                        }
                                      />
                                    </View>
                                  ))}
                              </View>
                            </CompactExercise>
                          </ReorderExercise>
                        ))}
                        <Button
                          title="Buscar e adicionar da biblioteca"
                          variant="outline"
                          disabled={busy || activeSession.exercises.length >= 40}
                          onPress={() => setLibrary(true)}
                        />
                        <Button
                          title="Adicionar exercício manualmente"
                          variant="ghost"
                          disabled={busy || activeSession.exercises.length >= 40}
                          onPress={() =>
                            session((s) => ({ ...s, exercises: [...s.exercises, emptyExercise()] }))
                          }
                        />
                        {checked.length ? (
                          <View style={card}>
                            <Text>
                              Edição em lote · {checked.length} selecionados nesta divisão
                            </Text>
                            <DetailsPanel title="Copiar séries, carga, RIR e técnicas de outro exercício">
                              {activeSession.exercises.map((source) => (
                                <Button
                                  key={source.key}
                                  title={`Copiar de ${source.name || 'exercício sem nome'}`}
                                  variant="outline"
                                  disabled={busy || !Number(source.sets)}
                                  onPress={() =>
                                    session((s) => ({
                                      ...s,
                                      exercises: s.exercises.map((e) =>
                                        checked.includes(e.key) && e.key !== source.key
                                          ? copyPrescription(source, e)
                                          : e,
                                      ),
                                    }))
                                  }
                                />
                              ))}
                            </DetailsPanel>
                            {
                              <StudioField
                                label={'Séries para os selecionados'}
                                value={batchSets}
                                onChange={setBatchSets}
                                maxLength={2}
                                disabled={busy}
                              />
                            }
                            {
                              <StudioField
                                label={'Descanso para os selecionados (s)'}
                                value={batchRest}
                                onChange={setBatchRest}
                                maxLength={4}
                                disabled={busy}
                              />
                            }
                            <Button
                              title="Aplicar séries e descanso (remove variações por série)"
                              disabled={
                                busy ||
                                !/^\d+$/.test(batchSets) ||
                                Number(batchSets) < 1 ||
                                Number(batchSets) > 20 ||
                                !/^\d+$/.test(batchRest) ||
                                Number(batchRest) > 1800
                              }
                              onPress={() =>
                                session((s) => ({
                                  ...s,
                                  exercises: s.exercises.map((e) =>
                                    checked.includes(e.key)
                                      ? {
                                          ...e,
                                          sets: batchSets,
                                          rest_seconds: batchRest,
                                          prescribed_sets: undefined,
                                        }
                                      : e,
                                  ),
                                }))
                              }
                            />
                          </View>
                        ) : null}
                      </View>
                      {desktopEditor ? (
                        <View
                          style={{
                            width: 340,
                            ...({ position: 'sticky', top: 16 } as unknown as ViewStyle),
                          }}
                        >
                          <RoutineLibrary
                            profileId={profileId}
                            key={activeSession.key}
                            exercises={activeSession.exercises}
                            disabled={busy}
                            onCustom={() =>
                              session((s) =>
                                s.exercises.length >= 40
                                  ? s
                                  : { ...s, exercises: [...s.exercises, emptyExercise()] },
                              )
                            }
                            onAdd={(item) =>
                              session((s) =>
                                s.exercises.length >= 40
                                  ? s
                                  : {
                                      ...s,
                                      exercises: [
                                        ...s.exercises,
                                        {
                                          ...emptyExercise(),
                                          name: exerciseName(item),
                                          muscle: muscleLabels[item.primaryMuscles[0]] || '',
                                          catalog: catalogReference(item),
                                        },
                                      ],
                                    },
                              )
                            }
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {undo ? (
                    <Button
                      title="Desfazer última remoção"
                      variant="outline"
                      disabled={busy}
                      onPress={() => {
                        change(() => undo);
                        setUndo(null);
                        setSelected(0);
                      }}
                    />
                  ) : null}
                  <Button
                    title="Adicionar divisão"
                    variant="outline"
                    disabled={busy || draft.sessions.length >= 12}
                    onPress={() => {
                      change((d) => ({
                        ...d,
                        sessions: [
                          ...d.sessions,
                          {
                            key: key(),
                            name: `Treino ${String.fromCharCode(65 + d.sessions.length)}`,
                            exercises: [],
                          },
                        ],
                      }));
                      setSelected(draft.sessions.length);
                      setChecked([]);
                    }}
                  />
                  <Button
                    title="Salvar rascunho"
                    variant="outline"
                    loading={busy}
                    onPress={() =>
                      void run(async () => {
                        await savePlan();
                        setNotice(
                          'Ficha salva. O aluno continua com a versão publicada até você publicar a atualização.',
                        );
                      })
                    }
                  />

                  <DetailsPanel title="Modelos e cópias">
                    <Button
                      title="Salvar como modelo reutilizável"
                      variant="outline"
                      disabled={busy}
                      onPress={() =>
                        void run(async () => {
                          const problems = issues(draft, true);
                          if (problems.length) throw new Error(problems.join('\n'));
                          await rpc('workout_studio_api', 'template_save', {
                            content: toContent(draft),
                          });
                          const s = await rpc<Studio>('workout_studio_api', 'read');
                          setStudio(s);
                          setNotice('Modelo salvo. As cópias serão independentes.');
                        })
                      }
                    />
                    {studio.students
                      .filter((s) => s.id !== linkId)
                      .map((s) => (
                        <Button
                          key={s.id}
                          title={`Copiar rascunho para ${s.name}`}
                          variant="outline"
                          disabled={busy}
                          onPress={() =>
                            void run(async () => {
                              const problems = issues(draft, false);
                              if (problems.length) throw new Error(problems.join('\n'));
                              await rpc('workout_studio_api', 'copy', {
                                target: s.id,
                                content: toContent(draft),
                              });
                              setNotice(`Cópia independente criada como rascunho para ${s.name}.`);
                            })
                          }
                        />
                      ))}
                  </DetailsPanel>
                </>
              )}
              <Button
                title="Sair do editor e manter rascunho"
                variant="ghost"
                disabled={busy}
                onPress={() => void run(leave)}
              />
            </>
          ) : (
            <>
              <Button title="Começar ficha do zero" disabled={busy} onPress={() => open()} />
              {studio.recovery ? (
                <Button
                  title={`Retomar rascunho salvo em ${new Date(studio.recovery.updated_at).toLocaleString('pt-BR')}`}
                  variant="outline"
                  disabled={busy}
                  onPress={() => resume(false)}
                />
              ) : null}
              <Button
                title="Recuperar alterações deste dispositivo"
                variant="ghost"
                disabled={busy}
                onPress={() => resume(true)}
              />
              <Text variant="title">Meus modelos</Text>
              {studio.templates.length ? (
                studio.templates.map((t) => (
                  <View key={t.id} style={card}>
                    <Text>{t.name}</Text>
                    <Button
                      title="Usar cópia deste modelo"
                      disabled={busy}
                      onPress={() => open(t.content)}
                    />
                    <Button
                      title="Remover modelo"
                      variant="ghost"
                      disabled={busy}
                      onPress={() =>
                        void run(async () => {
                          await rpc('workout_studio_api', 'template_delete', { id: t.id });
                          await load();
                        })
                      }
                    />
                  </View>
                ))
              ) : (
                <Text variant="caption">
                  Salve uma ficha completa como modelo para reutilizá-la.
                </Text>
              )}
              <Text variant="title">Fichas deste aluno</Text>
              {plans.map((p) => (
                <View key={p.id} style={card}>
                  <Text variant="title">{p.draft.title}</Text>
                  <Text>
                    {p.status === 'published'
                      ? 'Atual · publicada'
                      : p.status === 'archived'
                        ? 'Arquivada'
                        : 'Rascunho'}{' '}
                    · versão {p.version}
                  </Text>
                  {p.published_at ? (
                    <Text variant="caption">
                      Última publicação: {new Date(p.published_at).toLocaleString('pt-BR')}
                    </Text>
                  ) : null}
                  <DetailsPanel title="Ver exercícios desta ficha">
                    <WorkoutPreview content={p.draft} />
                  </DetailsPanel>
                  {p.status !== 'archived' ? (
                    <Button
                      title="Editar rascunho desta ficha"
                      disabled={busy}
                      onPress={() => open(p.draft, p)}
                    />
                  ) : null}
                  <Button
                    title="Duplicar como nova ficha"
                    variant="outline"
                    disabled={busy}
                    onPress={() =>
                      open({ ...p.draft, title: `${p.draft.title} (cópia)`.slice(0, 100) })
                    }
                  />
                  {p.status !== 'archived' ? (
                    <Button
                      title="Arquivar ficha"
                      variant="ghost"
                      disabled={busy}
                      onPress={() => setArchive(p)}
                    />
                  ) : null}
                </View>
              ))}
              {!plans.length ? (
                <Text>Nenhuma ficha criada. Comece do zero ou use um modelo.</Text>
              ) : null}
              <Button
                title={
                  history
                    ? 'Recolher versões anteriores'
                    : 'Consultar versões publicadas anteriores'
                }
                variant="outline"
                onPress={() => setHistory(!history)}
              />
              {history
                ? studio.versions.map((v) => (
                    <View key={v.id} style={card}>
                      <Text>
                        Versão {v.version} · {new Date(v.published_at).toLocaleString('pt-BR')}
                      </Text>
                      <WorkoutPreview content={v.content} />
                      <Button
                        title="Usar esta versão como nova ficha"
                        disabled={busy}
                        onPress={() => open(v.content)}
                      />
                    </View>
                  ))
                : null}
              <Button
                title="Atualizar fichas e modelos"
                variant="ghost"
                disabled={busy}
                onPress={() => void run(load)}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}
