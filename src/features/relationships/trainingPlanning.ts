import type { Draft, DraftExercise, Exercise, WorkoutContent } from './workoutModel';
import type { Execution } from './Executions';
import { isWorking, seriesFor } from './trainingMethods';
import { setEffort } from './workoutModel';
export function exerciseIdentity(e: Pick<Exercise, 'name' | 'catalog'>) {
  return e.catalog?.id
    ? `catalog:${e.catalog.id}`
    : `name:${e.name.trim().toLocaleLowerCase('pt-BR')}`;
}
export function latestPerformance(e: DraftExercise, rows: Execution[]) {
  for (const row of [...rows]
    .filter((r) => r.status === 'completed')
    .sort((a, b) => b.started_at.localeCompare(a.started_at))) {
    const i = row.snapshot.session.exercises.findIndex(
      (x) =>
        exerciseIdentity(x) === exerciseIdentity(e) &&
        (x.metric || 'reps') === (e.metric || 'reps'),
    );
    if (i >= 0)
      return {
        date: row.started_at,
        exercise: row.snapshot.session.exercises[i],
        logs: row.progress[i],
        discomfort: row.feedback?.some((f) => f.exercise_index === i && f.discomfort) || false,
      };
  }
  return null;
}
export function weeklyVolume(d: Draft | WorkoutContent) {
  const totals: Record<string, { work: number; preparation: number }> = {};
  for (const s of d.sessions)
    for (const e of s.exercises) {
      const muscle = e.muscle?.trim() || 'Sem músculo definido';
      const t = (totals[muscle] ??= { work: 0, preparation: 0 });
      for (let i = 0; i < Number(e.sets); i++)
        t[isWorking(seriesFor(e, i).kind) ? 'work' : 'preparation'] += s.times_per_week ?? 1;
    }
  return Object.entries(totals).sort((a, b) => b[1].work - a[1].work);
}
export function progressionSuggestion(e: DraftExercise, rows: Execution[]) {
  const p = e.progression,
    last = latestPerformance(e, rows);
  if (
    !p ||
    !last ||
    last.discomfort ||
    (e.metric && e.metric !== 'reps') ||
    e.prescribed_sets?.some((s) => s.technique)
  )
    return null;
  const logs = last.logs.filter((_, i) => isWorking(seriesFor(last.exercise, i).kind));
  if (
    logs.some((l) => {
      const target = setEffort(last.exercise, last.logs.indexOf(l));
      if (!target) return false;
      const actual = l.actual_effort;
      if (!actual) return true;
      const actualRir = actual.mode === 'rir' ? actual.min : 10 - actual.max;
      const minimumRir = target.mode === 'rir' ? target.min : 10 - target.max;
      return actualRir < minimumRir;
    })
  )
    return null;
  if (
    !logs.length ||
    logs.some(
      (l) =>
        !l.done ||
        l.reps == null ||
        l.reps < p.target_reps ||
        seriesFor(last.exercise, last.logs.indexOf(l)).technique,
    )
  )
    return null;
  if (p.mode === 'load') {
    const loads = logs.map((l) => l.weight);
    if (loads.some((x) => x == null) || new Set(loads).size !== 1) return null;
    return { load: `${Math.round((loads[0]! + p.increment) * 100) / 100} kg`, reps: e.reps };
  }
  const reps = Math.min(...logs.map((l) => l.reps!)) + p.increment;
  return { load: e.load || '', reps: String(reps) };
}
export function applyProgression(
  e: DraftExercise,
  suggestion: { load: string; reps: string },
): DraftExercise {
  return {
    ...e,
    load: suggestion.load,
    reps: suggestion.reps,
    prescribed_sets: e.prescribed_sets?.map((p) =>
      isWorking(p.kind) && !p.technique
        ? { ...p, load: suggestion.load, target: suggestion.reps }
        : p,
    ),
  };
}
export function phaseAt(content: Pick<WorkoutContent, 'starts' | 'phases'>, now = new Date()) {
  if (!content.starts || !content.phases?.length) return null;
  const start = new Date(`${content.starts}T12:00:00`),
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const day = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (day < 0) return { label: 'Ciclo ainda não iniciado', week: 0 };
  const week = Math.floor(day / 7) + 1;
  let end = 0;
  for (const p of content.phases) {
    end += p.weeks;
    if (week <= end) return { label: p.name, week, phase: p };
  }
  return { label: 'Ciclo concluído · aguarde revisão', week };
}
export function planningProblems(d: Draft) {
  const errors: string[] = [];
  if (d.phases?.length && !d.starts) errors.push('Defina o início do ciclo para usar as fases.');
  if (
    d.phases &&
    (d.phases.length > 12 ||
      d.phases.some(
        (p) =>
          !p.name.trim() ||
          p.name.length > 80 ||
          !Number.isInteger(p.weeks) ||
          p.weeks < 1 ||
          p.weeks > 26 ||
          !['build', 'deload'].includes(p.kind) ||
          p.notes.length > 500,
      ))
  )
    errors.push('Revise as fases: nome, duração de 1 a 26 semanas e orientações.');
  for (const s of d.sessions) {
    if (
      s.times_per_week != null &&
      (!Number.isInteger(s.times_per_week) || s.times_per_week < 1 || s.times_per_week > 7)
    )
      errors.push(`${s.name}: frequência entre 1 e 7 por semana.`);
    for (const e of s.exercises) {
      const p = e.progression;
      if (
        e.weekly_targets &&
        (e.weekly_targets.length > 26 ||
          new Set(e.weekly_targets.map((t) => t.week)).size !== e.weekly_targets.length ||
          e.weekly_targets.some(
            (t) =>
              !Number.isInteger(t.week) ||
              t.week < 1 ||
              t.week > 52 ||
              t.load.length > 100 ||
              !t.reps.trim() ||
              t.reps.length > 40,
          ))
      )
        errors.push(`${e.name}: revise as metas semanais.`);
      if (
        p &&
        (!['load', 'reps'].includes(p.mode) ||
          !Number.isFinite(p.increment) ||
          p.increment <= 0 ||
          p.increment > 100 ||
          !Number.isInteger(p.target_reps) ||
          p.target_reps < 1 ||
          p.target_reps > 1000 ||
          (p.mode === 'reps' && !Number.isInteger(p.increment)))
      )
        errors.push(`${e.name}: revise a progressão.`);
      if (
        e.approved_alternatives &&
        (e.approved_alternatives.length > 5 ||
          e.approved_alternatives.some((a) => !a.name.trim() || a.name.length > 120) ||
          new Set(e.approved_alternatives.map(exerciseIdentity)).size !==
            e.approved_alternatives.length)
      )
        errors.push(`${e.name}: use até 5 alternativas diferentes.`);
    }
  }
  return errors;
}
