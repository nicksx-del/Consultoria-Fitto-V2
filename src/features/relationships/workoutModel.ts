import type { CatalogReference } from './exerciseCatalog';
import { isWorking, methodProblems } from './trainingMethods';
import { planningProblems } from './trainingPlanning';
export type EffortTarget = { mode: 'rir' | 'rpe'; min: number; max: number };
export type SetPrescription = {
  target: string;
  load: string;
  rest: string;
  kind: 'work' | 'warmup' | 'ramp' | 'top' | 'backoff';
  notes?: string;
  technique?: SeriesTechnique;
  effort_target?: EffortTarget | null;
};
export type Exercise = {
  weekly_targets?: { week: number; load: string; reps: string }[];
  progression?: { mode: 'load' | 'reps'; increment: number; target_reps: number };
  approved_alternatives?: { name: string; catalog?: CatalogReference }[];
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string;
  muscle?: string;
  load?: string;
  metric?: 'reps' | 'seconds' | 'meters';
  effort?: string;
  effort_target?: EffortTarget | null;
  cadence?: string;
  alternatives?: string;
  method?: string;
  group?: string;
  group_rule?: ExerciseGroup;
  video?: string;
  catalog?: CatalogReference;
  prescribed_sets?: SetPrescription[];
};
export type TechniqueStep = {
  target: string;
  load: string;
  rest: string;
  seconds?: string;
  reduction?: string;
};
export type SeriesTechnique = {
  type: 'rest_pause' | 'drop_set' | 'cluster' | 'isometric';
  steps: TechniqueStep[];
};
export type ExerciseGroup = {
  id: string;
  type: 'superset' | 'biset' | 'circuit';
  rounds: number;
  rest_seconds: number;
};
export type WorkoutContent = {
  phases?: { name: string; weeks: number; kind: 'build' | 'deload'; notes: string }[];
  title: string;
  notes: string;
  goal?: string;
  starts?: string;
  review?: string;
  sessions: { name: string; days?: string; times_per_week?: number; exercises: Exercise[] }[];
};
export type Plan = {
  id: string;
  status: 'draft' | 'published' | 'archived';
  draft: WorkoutContent;
  published: WorkoutContent | null;
  version: number;
  published_at: string | null;
};
export type DraftExercise = Omit<Exercise, 'sets' | 'rest_seconds'> & {
  key: string;
  sets: string;
  rest_seconds: string;
};
export type Draft = Omit<WorkoutContent, 'sessions'> & {
  sessions: {
    key: string;
    name: string;
    days?: string;
    times_per_week?: number;
    exercises: DraftExercise[];
  }[];
};
let sequence = 0;
export function key() {
  return `item-${Date.now()}-${++sequence}`;
}
export function emptyExercise(): DraftExercise {
  return {
    key: key(),
    name: '',
    sets: '3',
    reps: '8–12',
    rest_seconds: '60',
    notes: '',
    metric: 'reps',
  };
}
export function toDraft(content?: WorkoutContent): Draft {
  return content
    ? {
        ...content,
        sessions: content.sessions.map((s) => ({
          ...s,
          key: key(),
          exercises: s.exercises.map((e) => ({
            ...e,
            key: key(),
            sets: String(e.sets),
            rest_seconds: String(e.rest_seconds),
          })),
        })),
      }
    : {
        title: '',
        notes: '',
        goal: '',
        starts: '',
        review: '',
        sessions: [{ key: key(), name: 'Treino A', exercises: [] }],
      };
}
export function toContent(d: Draft): WorkoutContent {
  return {
    ...d,
    title: d.title.trim(),
    sessions: d.sessions.map(({ key: ignored, ...s }) => ({
      ...s,
      exercises: s.exercises.map(({ key: ignored2, ...e }) => ({
        ...e,
        sets: Number(e.sets),
        rest_seconds: Number(e.rest_seconds),
      })),
    })),
  };
}
export function issues(d: Draft, publishing: boolean): string[] {
  const errors: string[] = planningProblems(d);
  if (d.title.trim().length < 2)
    errors.push('Informe um nome de ficha com pelo menos 2 caracteres.');
  if (d.starts && !/^\d{4}-\d{2}-\d{2}$/.test(d.starts))
    errors.push('Use AAAA-MM-DD na data de início.');
  if (d.review && !/^\d{4}-\d{2}-\d{2}$/.test(d.review))
    errors.push('Use AAAA-MM-DD na data de revisão.');
  if (d.starts && d.review && d.review < d.starts)
    errors.push('A revisão deve ocorrer a partir do início.');
  d.sessions.forEach((s, i) => {
    if (!s.name.trim()) errors.push(`Dê um nome à divisão ${i + 1}.`);
    if (publishing && !s.exercises.length)
      errors.push(`${s.name}: adicione ao menos um exercício.`);
    s.exercises.forEach((e, j) => {
      errors.push(...methodProblems(e).map((message) => `${e.name}: ${message}`));
      if (e.group_rule) {
        const g = e.group_rule,
          members = s.exercises.filter((x) => x.group_rule?.id === g.id);
        if (
          !['superset', 'biset', 'circuit'].includes(g.type) ||
          members.length < 2 ||
          (g.type === 'biset' && members.length !== 2) ||
          !Number.isInteger(g.rounds) ||
          g.rounds < 1 ||
          g.rounds > 20 ||
          !Number.isInteger(g.rest_seconds) ||
          g.rest_seconds < 0 ||
          g.rest_seconds > 1800 ||
          members.some(
            (x) =>
              Number(x.sets) !== g.rounds || JSON.stringify(x.group_rule) !== JSON.stringify(g),
          )
        )
          errors.push(`${e.name}: revise os exercícios, voltas e descanso do grupo.`);
      }
      if (e.effort_target != null && !validEffort(e.effort_target))
        errors.push(`${e.name || `Exercício ${j + 1}`}: meta de esforço inválida.`);
      if (e.prescribed_sets?.some((p) => p.effort_target != null && !validEffort(p.effort_target)))
        errors.push(`${e.name}: confira o RIR/RPE das séries.`);
      if (
        !e.name.trim() ||
        !e.reps.trim() ||
        !/^\d+$/.test(e.sets) ||
        Number(e.sets) < 1 ||
        Number(e.sets) > 20 ||
        !/^\d+$/.test(e.rest_seconds) ||
        Number(e.rest_seconds) > 1800
      )
        errors.push(
          `${s.name}, exercício ${j + 1}: complete nome, alvo, séries (1–20) e descanso (0–1800s).`,
        );
      if (e.video && !/^https:\/\/\S+$/.test(e.video))
        errors.push(`${e.name}: o vídeo precisa de um link HTTPS.`);
      if (
        e.prescribed_sets?.length &&
        (e.prescribed_sets.length !== Number(e.sets) ||
          e.prescribed_sets.some(
            (p) => !p.target.trim() || !/^\d+$/.test(p.rest) || Number(p.rest) > 1800,
          ))
      )
        errors.push(`${e.name}: revise os alvos e descansos de cada série.`);
      if (
        ['Supersérie', 'Bi-set'].includes(e.method ?? '') &&
        (!e.group?.trim() ||
          s.exercises.filter((x) => x.group === e.group && x.method === e.method).length < 2)
      )
        errors.push(`${e.name}: identifique ao menos dois exercícios do mesmo grupo combinado.`);
    });
  });
  return errors;
}
export function unit(e: Pick<Exercise, 'metric'>) {
  return e.metric === 'seconds' ? 's' : e.metric === 'meters' ? 'm' : 'rep.';
}
export function prescription(e: Exercise) {
  return [
    e.load && `Carga: ${e.load}`,
    e.effort && `Esforço: ${e.effort}`,
    e.effort_target && `Meta das séries de trabalho: ${effortLabel(e.effort_target)}`,
    e.cadence && `Cadência: ${e.cadence}`,
    e.method && `${e.method}${e.group ? ` · grupo ${e.group}` : ''}`,
    e.alternatives && `Alternativas: ${e.alternatives}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
export function validEffort(value: unknown): value is EffortTarget {
  if (!value || typeof value !== 'object') return false;
  const v = value as EffortTarget;
  return (
    (v.mode === 'rir' || v.mode === 'rpe') &&
    Number.isFinite(v.min) &&
    Number.isFinite(v.max) &&
    v.min <= v.max &&
    v.min >= (v.mode === 'rir' ? 0 : 1) &&
    v.max <= 10 &&
    (v.mode === 'rir'
      ? Number.isInteger(v.min) && Number.isInteger(v.max)
      : Number.isInteger(v.min * 2) && Number.isInteger(v.max * 2))
  );
}
export function effortLabel(value: EffortTarget | null | undefined) {
  if (!validEffort(value)) return 'Sem meta de esforço';
  const number = (v: number) => String(v).replace('.', ',');
  return `${value.mode.toUpperCase()} ${number(value.min)}${value.max !== value.min ? `–${number(value.max)}` : ''}`;
}
export function setEffort(e: Pick<Exercise, 'effort_target' | 'prescribed_sets'>, index: number) {
  const p = e.prescribed_sets?.[index];
  const value =
    p?.effort_target !== undefined ? p.effort_target : !isWorking(p?.kind) ? null : e.effort_target;
  return validEffort(value) ? value : null;
}
