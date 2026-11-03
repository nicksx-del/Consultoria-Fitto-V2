import type { DraftExercise, Exercise, SetPrescription, WorkoutContent } from './workoutModel';
export const kindInfo = {
  warmup: {
    label: 'Aquecimento',
    badge: 'A',
    description:
      'Série de preparação para iniciar o movimento. Fica fora das comparações de séries de trabalho.',
    example: 'Preparar o movimento antes da carga de trabalho.',
  },
  ramp: {
    label: 'Aproximação',
    badge: 'P',
    description: 'Série preparatória para se aproximar gradualmente da carga de trabalho.',
    example: 'Subir a carga entre séries preparatórias, conforme a prescrição.',
  },
  work: {
    label: 'Trabalho',
    badge: '',
    description: 'Série principal, seguindo a carga, o alvo e o esforço prescritos.',
    example: 'Executar o alvo de repetições e o RIR definidos.',
  },
  top: {
    label: 'Top set',
    badge: 'T',
    description:
      'Série principal de maior destaque ou carga dentro da sequência planejada pelo treinador.',
    example: 'Uma série principal seguida de séries back-off.',
  },
  backoff: {
    label: 'Back-off',
    badge: 'B',
    description:
      'Série após a principal, geralmente com carga reduzida conforme orientação do treinador.',
    example: 'Depois do top set, usar a carga indicada para as séries seguintes.',
  },
};
export const techniqueInfo = {
  traditional: {
    label: 'Tradicional',
    description: 'Uma etapa contínua, seguida pelo descanso prescrito.',
    example: 'Uma série e depois o intervalo indicado.',
  },
  rest_pause: {
    label: 'Rest-pause',
    description:
      'Uma série dividida em uma etapa inicial e retomadas após pausas curtas. Cada etapa tem alvo e intervalo próprios.',
    example: 'Etapa inicial → pausa prescrita → retomada → pausa → retomada.',
  },
  drop_set: {
    label: 'Drop-set',
    description:
      'Etapas consecutivas com reduções de carga prescritas. A redução pode ser indicada em kg ou percentual.',
    example: 'Carga inicial → reduzir a carga → executar a próxima etapa.',
  },
  cluster: {
    label: 'Cluster',
    description:
      'A série é distribuída em blocos de repetições com intervalos internos prescritos.',
    example: 'Bloco de repetições → pausa interna → próximo bloco.',
  },
  isometric: {
    label: 'Isometria',
    description:
      'Sustentação de uma posição pelo tempo prescrito. O treinador define a posição nas orientações.',
    example: 'Sustentar a posição pelo tempo indicado e registrar a duração realizada.',
  },
};
export const groupInfo = {
  superset: {
    label: 'Supersérie',
    description:
      'Exercícios executados em sequência na ordem prescrita, com descanso entre voltas.',
    example: 'Exercício 1 → exercício 2 → descanso → repetir.',
  },
  biset: {
    label: 'Bi-set',
    description:
      'Agrupamento de dois exercícios consecutivos. O aplicativo segue a ordem definida pelo treinador.',
    example: 'Dois movimentos em sequência, depois o descanso da volta.',
  },
  circuit: {
    label: 'Circuito',
    description: 'Sequência de exercícios repetida pelo número de voltas prescrito.',
    example: 'Percorrer todos os movimentos, descansar e iniciar a próxima volta.',
  },
};
export function isWorking(kind?: string) {
  return kind !== 'warmup' && kind !== 'ramp';
}
export function seriesFor(e: Exercise | DraftExercise, index: number): SetPrescription {
  return (
    e.prescribed_sets?.[index] ?? {
      target: e.reps,
      load: e.load || '',
      rest: String(e.rest_seconds),
      kind: 'work',
    }
  );
}
export function methodProblems(e: Exercise | DraftExercise): string[] {
  const errors: string[] = [];
  e.prescribed_sets?.forEach((s, i) => {
    if (!Object.hasOwn(kindInfo, s.kind)) errors.push(`Série ${i + 1}: tipo inválido.`);
    if (s.notes && s.notes.length > 500) errors.push(`Série ${i + 1}: orientação longa demais.`);
    if (s.technique) {
      const t = s.technique;
      if (
        !Object.hasOwn(techniqueInfo, t.type) ||
        !Array.isArray(t.steps) ||
        t.steps.length < (t.type === 'isometric' ? 1 : 2) ||
        t.steps.length > 8
      ) {
        errors.push(`Série ${i + 1}: revise as etapas da técnica.`);
        return;
      }
      if (
        t.steps.some(
          (p) =>
            !p.target.trim() ||
            p.target.length > 40 ||
            p.load.length > 100 ||
            !/^\d{1,4}$/.test(p.rest) ||
            Number(p.rest) > 1800 ||
            (t.type === 'isometric' &&
              (!/^\d{1,4}$/.test(p.seconds || '') ||
                Number(p.seconds) < 1 ||
                Number(p.seconds) > 1800)) ||
            (p.reduction && (!/^\d{1,2}$/.test(p.reduction) || Number(p.reduction) > 99)),
        )
      )
        errors.push(`Série ${i + 1}: complete alvos, tempos e reduções das etapas.`);
      if (t.type === 'drop_set' && t.steps.slice(1).some((p) => !p.load.trim() && !p.reduction))
        errors.push(`Série ${i + 1}: informe a carga ou a redução percentual de cada drop.`);
    }
  });
  return errors;
}
export function estimateExerciseSeconds(
  e: Exercise | DraftExercise,
  all: (Exercise | DraftExercise)[],
) {
  let seconds = 120;
  const g = e.group_rule;
  const last = g ? all.filter((x) => x.group_rule?.id === g.id).at(-1) === e : false;
  for (let i = 0; i < Number(e.sets); i++) {
    const p = seriesFor(e, i);
    const activity = (target: string) =>
      e.metric === 'seconds' && /^\d+$/.test(target) ? Number(target) : 40;
    seconds += p.technique
      ? p.technique.steps.reduce(
          (n, s, j) =>
            n +
            (p.technique!.type === 'isometric' ? Number(s.seconds) : activity(s.target)) +
            (j < p.technique!.steps.length - 1 ? Number(s.rest) : 0),
          0,
        )
      : activity(p.target);
    seconds += g ? (last ? g.rest_seconds : 0) : Number(p.rest);
  }
  return seconds;
}
export function copyPrescription(source: DraftExercise, target: DraftExercise): DraftExercise {
  const count = target.group_rule?.rounds ?? Number(source.sets);
  const rows = Array.from({ length: count }, (_, i) =>
    structuredClone(seriesFor(source, Math.min(i, Math.max(0, Number(source.sets) - 1)))),
  );
  return {
    ...target,
    sets: String(count),
    reps: source.reps,
    rest_seconds: source.rest_seconds,
    load: source.load,
    metric: source.metric,
    effort: source.effort,
    effort_target: structuredClone(source.effort_target),
    cadence: source.cadence,
    prescribed_sets: rows,
  };
}
export function workoutDiff(
  before: WorkoutContent | null | undefined,
  after: WorkoutContent,
): string[] {
  if (!before)
    return [
      `Primeira publicação: ${after.sessions.length} divisões e ${after.sessions.reduce((n, s) => n + s.exercises.length, 0)} exercícios.`,
    ];
  const changes: string[] = [];
  if (
    ['title', 'notes', 'goal', 'starts', 'review'].some(
      (k) => before[k as keyof WorkoutContent] !== after[k as keyof WorkoutContent],
    )
  )
    changes.push('Nome, objetivo, datas ou orientações gerais atualizados.');
  if (JSON.stringify(before.phases) !== JSON.stringify(after.phases))
    changes.push('Periodização e fases atualizadas.');
  if (
    JSON.stringify(before.sessions.map((s) => [s.name, s.days, s.times_per_week])) !==
    JSON.stringify(after.sessions.map((s) => [s.name, s.days, s.times_per_week]))
  )
    changes.push('Divisões ou frequência alteradas.');
  const available = before.sessions.flatMap((s, si) =>
    s.exercises.map((e, i) => ({ e, si, i, used: false })),
  );
  after.sessions.forEach((s, si) =>
    s.exercises.forEach((e, i) => {
      const found = available.find(
        (x) => !x.used && (x.e.catalog?.id || x.e.name) === (e.catalog?.id || e.name),
      );
      if (!found) {
        changes.push(`Adicionado: ${e.name}.`);
        return;
      }
      found.used = true;
      if (JSON.stringify(found.e) !== JSON.stringify(e))
        changes.push(`Prescrição atualizada: ${e.name}.`);
      if (found.si !== si || found.i !== i) changes.push(`Ordem ou divisão alterada: ${e.name}.`);
    }),
  );
  available.filter((x) => !x.used).forEach((x) => changes.push(`Removido: ${x.e.name}.`));
  return changes.length ? changes : ['Nenhuma alteração em relação à ficha atual.'];
}
