import { animatedStarter } from './animatedStarter';
import { supplementalCatalog, legacyAnimatedIds } from './supplementalCatalog';
export const CATALOG_URL = 'https://oss.exercisedb.dev/api/v1/exercises';
export const CATALOG_SOURCE = 'https://exercisedb.dev/';
export const LEGACY_CATALOG_SOURCE = 'https://github.com/yuhonas/free-exercise-db';
export const STARTER_SEARCHES = [
  'bench press',
  'squat',
  'deadlift',
  'row',
  'pulldown',
  'curl',
  'triceps',
  'shoulder press',
  'lateral raise',
  'leg extension',
  'leg curl',
  'calf',
  'crunch',
  'push up',
  'pull up',
  'lunge',
  'plank',
];
const translatedNames: Record<string, string> = {
  'cable low seated row': 'Remada baixa sentada na polia',
  'dumbbell incline curl': 'Rosca inclinada com halteres',
  'dumbbell alternate seated hammer curl': 'Rosca martelo alternada sentada',
  'dumbbell squat': 'Agachamento com halteres',
  'barbell split squat': 'Agachamento dividido com barra',
  'barbell standing calf raise': 'Panturrilha em pé com barra',
  'barbell seated calf raise': 'Panturrilha sentada com barra',
  'dumbbell seated calf raise': 'Panturrilha sentada com halteres',
  'barbell sumo deadlift': 'Levantamento terra sumô',
  'barbell straight leg deadlift': 'Terra com pernas estendidas',
  'machine lying leg curl': 'Mesa flexora na máquina',
  'dumbbell front raise': 'Elevação frontal com halteres',
  'dumbbell rear lateral raise': 'Elevação lateral posterior com halteres',
  'dumbbell incline row': 'Remada inclinada com halteres',
  'dumbbell pullover': 'Pullover com halter',
  'cable lateral raise': 'Elevação lateral na polia',
  'barbell decline bench press': 'Supino declinado com barra',
  'barbell bench press': 'Supino reto com barra',
  'dumbbell bench press': 'Supino reto com halteres',
  'barbell incline bench press': 'Supino inclinado com barra',
  'dumbbell incline bench press': 'Supino inclinado com halteres',
  'barbell squat': 'Agachamento com barra',
  'barbell full squat': 'Agachamento completo com barra',
  'barbell deadlift': 'Levantamento terra com barra',
  'dumbbell lateral raise': 'Elevação lateral com halteres',
  'dumbbell seated shoulder press': 'Desenvolvimento sentado com halteres',
  'dumbbell shoulder press': 'Desenvolvimento com halteres',
  'cable seated row': 'Remada baixa na polia',
  'cable lat pulldown': 'Puxada alta na polia',
  'dumbbell biceps curl': 'Rosca direta com halteres',
  'barbell curl': 'Rosca direta com barra',
  'dumbbell hammer curl': 'Rosca martelo com halteres',
  'lever leg extension': 'Cadeira extensora',
  'lever lying leg curl': 'Mesa flexora',
  'bodyweight squat': 'Agachamento livre',
  plank: 'Prancha',
  crunch: 'Abdominal',
  'push up': 'Flexão de braços',
  'pull up': 'Barra fixa',
  'barbell jm bench press': 'Supino JM com barra',
  'barbell wide bench press': 'Supino com barra e pegada aberta',
  'band bench press': 'Supino com elástico',
  'cable bench press': 'Supino na polia',
  'barbell pin presses': 'Supino com barra nos pinos de segurança',
  'barbell bench squat': 'Agachamento com barra no banco',
  'ez bar jm bench press': 'Supino JM com barra W',
  'barbell bench front squat': 'Agachamento frontal com barra no banco',
  'barbell squat on knees': 'Agachamento ajoelhado com barra',
  'barbell seated twist': 'Rotação de tronco sentada com barra',
  'barbell seated good morning': 'Bom-dia sentado com barra',
  'cable deadlift': 'Levantamento terra na polia',
  'trap bar deadlift': 'Levantamento terra com barra hexagonal',
  'dumbbell deadlift': 'Levantamento terra com halteres',
  'barbell decline pullover': 'Pullover declinado com barra',
  'barbell decline wide grip press': 'Supino declinado com barra e pegada aberta',
  'barbell decline bent arm pullover': 'Pullover declinado com barra e cotovelos flexionados',
  'barbell decline wide grip pullover': 'Pullover declinado com barra e pegada aberta',
  'barbell decline close grip to skull press':
    'Supino fechado com tríceps testa no banco declinado',
  'cable rope elevated seated row': 'Remada sentada com corda na polia alta',
  'cable rope extension incline bench row': 'Remada com corda na polia e banco inclinado',
  'cable twist': 'Rotação de tronco na polia',
  'cable low fly': 'Crucifixo na polia baixa',
  'cable crossover': 'Crucifixo cruzado na polia',
  'cable rear drive': 'Remada alta com rotação na polia',
  'cable wrist curl': 'Flexão de punhos na polia',
  'cable reverse curl': 'Rosca inversa na polia',
  'cable twisting pull': 'Puxada com rotação de tronco na polia',
  'alternate lateral pulldown': 'Puxada alta alternada',
  'cable bar lateral pulldown': 'Puxada alta com barra na polia',
  'cable pulldown pro lat bar': 'Puxada alta com barra anatômica',
  'cable crossover lateral pulldown': 'Puxada alta cruzada na polia',
  'cable lateral pulldown with v bar': 'Puxada alta com triângulo',
  'reverse grip machine lat pulldown': 'Puxada alta na máquina com pegada supinada',
  'machine reverse grip lateral pulldown': 'Puxada alta na máquina com pegada supinada',
  'twin handle parallel grip lat pulldown': 'Puxada alta com pegada neutra e puxadores individuais',
  'dumbbell reverse spider curl': 'Rosca aranha inversa com halteres',
  'dumbbell clean': 'Levantamento de halteres aos ombros',
  'dumbbell burpee': 'Burpee com halteres',
  'dumbbell rear fly': 'Crucifixo inverso com halteres',
  'dumbbell iron cross': 'Cruz de ferro com halteres',
  'dumbbell lateral to front raise': 'Elevação lateral e frontal com halteres',
  'dumbbell rear lateral raise support head': 'Elevação posterior com halteres e cabeça apoiada',
  'dumbbell lying single arm rear lateral raise':
    'Elevação posterior unilateral deitada com halter',
  'landmine lateral raise': 'Elevação lateral com barra ancorada',
  'cable seated rear lateral raise': 'Elevação posterior sentada na polia',
  'single arm bent over cable lateral raise': 'Elevação posterior unilateral curvada na polia',
  'inverse leg curl on pull up cable machine': 'Flexão de joelhos invertida na máquina de puxada',
  'finger curls': 'Flexão de dedos',
  'cable seated curl': 'Rosca sentada na polia',
  'ez bar spider curl': 'Rosca aranha com barra W',
  'cable squatting curl': 'Rosca agachada na polia',
};
const portugueseNames: Record<string, string> = {
  'Barbell_Bench_Press_-_Medium_Grip': 'Supino reto com barra',
  'Barbell_Incline_Bench_Press_-_Medium_Grip': 'Supino inclinado com barra',
  Dumbbell_Bench_Press: 'Supino reto com halteres',
  Decline_Dumbbell_Bench_Press: 'Supino declinado com halteres',
  Decline_Barbell_Bench_Press: 'Supino declinado com barra',
  Machine_Bench_Press: 'Supino na máquina',
  'Close-Grip_Barbell_Bench_Press': 'Supino com pegada fechada',
  Barbell_Squat: 'Agachamento com barra',
  Barbell_Full_Squat: 'Agachamento completo com barra',
  Bodyweight_Squat: 'Agachamento livre',
  Dumbbell_Squat: 'Agachamento com halteres',
  Goblet_Squat: 'Agachamento goblet',
  Hack_Squat: 'Agachamento hack',
  Front_Barbell_Squat: 'Agachamento frontal com barra',
  Barbell_Deadlift: 'Levantamento terra com barra',
  Romanian_Deadlift: 'Levantamento terra romeno',
  Leg_Press: 'Leg press',
  Leg_Extensions: 'Cadeira extensora',
  Seated_Leg_Curl: 'Flexora sentada',
  Lying_Leg_Curls: 'Mesa flexora deitada',
  Seated_Cable_Rows: 'Remada baixa na polia',
  Bent_Over_Barbell_Row: 'Remada curvada com barra',
  'One-Arm_Dumbbell_Row': 'Remada unilateral com halter',
  'Wide-Grip_Lat_Pulldown': 'Puxada alta com pegada aberta',
  'Close-Grip_Front_Lat_Pulldown': 'Puxada alta com pegada fechada',
  Dumbbell_Bicep_Curl: 'Rosca direta com halteres',
  Barbell_Curl: 'Rosca direta com barra',
  Hammer_Curls: 'Rosca martelo',
  Incline_Dumbbell_Curl: 'Rosca inclinada com halteres',
  Alternate_Incline_Dumbbell_Curl: 'Rosca alternada inclinada',
  Triceps_Pushdown: 'Tríceps na polia',
  'Triceps_Pushdown_-_Rope_Attachment': 'Tríceps na corda',
  Side_Lateral_Raise: 'Elevação lateral com halteres',
  Front_Dumbbell_Raise: 'Elevação frontal com halteres',
  Seated_Dumbbell_Press: 'Desenvolvimento sentado com halteres',
  Standing_Military_Press: 'Desenvolvimento militar com barra',
  Pushups: 'Flexão de braços',
  Pullups: 'Barra fixa',
  Plank: 'Prancha',
  Crunches: 'Abdominal',
  Standing_Calf_Raises: 'Elevação de panturrilhas em pé',
  Seated_Calf_Raise: 'Panturrilha sentada',
};
const additionalNames: Record<string, string> = {
  edb_hrVQWvE: 'Stiff com barra',
  Incline_Dumbbell_Press: 'Supino inclinado com halteres',
  Standing_Dumbbell_Triceps_Extension: 'Tríceps francês com halter',
  Butterfly: 'Peck deck / Voador',
  'T-Bar_Row_with_Handle': 'Remada T-bar (cavalinho)',
  'Straight-Arm_Pulldown': 'Pull down na polia (braços estendidos)',
  Dumbbell_Alternate_Bicep_Curl: 'Rosca alternada com halteres',
  Thigh_Adductor: 'Cadeira adutora',
  Hack_Squat: 'Agachamento hack na máquina',
  Leg_Extensions: 'Cadeira extensora',
};
const exerciseAliases: Record<string, string[]> = {
  edb_hrVQWvE: ['stiff com barra', 'stiff', 'terra com pernas estendidas'],
  Incline_Dumbbell_Press: ['supino inclinado c/ halteres', 'supino inclinado com halter'],
  Standing_Dumbbell_Triceps_Extension: ['triceps frances', 'frances bilateral'],
  Butterfly: ['peck deck', 'pec deck', 'voador', 'crucifixo maquina'],
  'T-Bar_Row_with_Handle': ['t-bar', 't bar', 'remada cavalinho'],
  'Straight-Arm_Pulldown': ['pull down', 'pulldown', 'pullover polia'],
  Dumbbell_Alternate_Bicep_Curl: ['rosca alternada c/ halteres', 'rosca alternada com halter'],
  Thigh_Adductor: ['adutora', 'aducao de quadril'],
  Hack_Squat: ['agachamento rack', 'agachamento hack', 'hack maquina inclinada'],
  Leg_Extensions: ['extensora', 'extensao de joelhos'],
};
function legacyCatalogId(id: string) {
  return Object.entries(legacyAnimatedIds).find(([, animated]) => animated === id)?.[0] || id;
}
export function animatedCatalogId(id: string) {
  ensureCatalog();
  const animated = legacyAnimatedIds[id] || id;
  return duplicateCatalogIds.get(animated) || animated;
}
export function resolveCatalogReference(catalog?: CatalogReference): CatalogReference | undefined {
  if (!catalog || catalog.provider !== 'free-exercise-db') return catalog;
  const id = legacyAnimatedIds[catalog.id];
  const replacement = supplementalCatalog.find((item) => item.id === id);
  return replacement ? catalogReference(replacement as CatalogExercise) : catalog;
}
export function exerciseName(e: Pick<CatalogExercise, 'id' | 'name'>) {
  return (
    additionalNames[legacyCatalogId(e.id)] ||
    portugueseNames[e.id] ||
    translatedNames[normalize(e.name)] ||
    e.name
  );
}
export function sortCatalog(rows: CatalogExercise[]) {
  const popular = Object.keys(portugueseNames);
  return [...rows].sort((a, b) => {
    const ai =
        a.provider === 'exercisedb'
          ? Object.keys(translatedNames).indexOf(normalize(a.name))
          : popular.indexOf(a.id),
      bi =
        b.provider === 'exercisedb'
          ? Object.keys(translatedNames).indexOf(normalize(b.name))
          : popular.indexOf(b.id);
    return (
      (ai < 0 ? 10000 : ai) - (bi < 0 ? 10000 : bi) ||
      exerciseName(a).localeCompare(exerciseName(b), 'pt-BR')
    );
  });
}
const IMAGE_ROOT = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
export type CatalogExercise = {
  provider?: 'free-exercise-db' | 'exercisedb';
  id: string;
  name: string;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
  level: string;
  category: string;
};
export type CatalogReference = {
  provider: 'free-exercise-db' | 'exercisedb';
  id: string;
  instructions: string;
  images: string[];
};
export const muscleLabels: Record<string, string> = {
  abdominals: 'Abdômen',
  abductors: 'Abdutores',
  adductors: 'Adutores',
  biceps: 'Bíceps',
  calves: 'Panturrilhas',
  chest: 'Peito',
  forearms: 'Antebraços',
  glutes: 'Glúteos',
  hamstrings: 'Posteriores',
  lats: 'Dorsais',
  'lower back': 'Lombar',
  'middle back': 'Costas',
  neck: 'Pescoço',
  quadriceps: 'Quadríceps',
  shoulders: 'Ombros',
  traps: 'Trapézio',
  triceps: 'Tríceps',
};
export const equipmentLabels: Record<string, string> = {
  'leverage machine': 'Máquina',
  'smith machine': 'Smith',
  assisted: 'Assistido',
  weighted: 'Com carga',
  barbell: 'Barra',
  dumbbell: 'Halteres',
  cable: 'Polia',
  machine: 'Máquina',
  'body only': 'Peso corporal',
  bands: 'Elásticos',
  kettlebells: 'Kettlebell',
  'exercise ball': 'Bola',
  'medicine ball': 'Medicine ball',
  'e-z curl bar': 'Barra W',
  foam_roll: 'Rolo',
  other: 'Outros',
};
export function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const terms: Record<string, string> = {
  baixa: 'seated',
  alta: 'lat',
  corda: 'rope',
  elastico: 'band',
  supino: 'bench press',
  agachamento: 'squat',
  agachar: 'squat',
  remada: 'row',
  rosca: 'curl',
  puxada: 'pulldown',
  abdominal: 'crunch',
  abdominais: 'crunch',
  flexao: 'push up',
  prancha: 'plank',
  afundo: 'lunge',
  passada: 'lunge',
  levantamento: 'deadlift',
  terra: 'deadlift',
  desenvolvimento: 'shoulder press',
  elevacao: 'raise',
  lateral: 'lateral',
  frontal: 'front',
  crucifixo: 'fly',
  extensora: 'leg extension',
  flexora: 'leg curl',
  panturrilha: 'calf',
  panturrilhas: 'calf',
  pullover: 'pull over',
  mergulho: 'dip',
  paralelas: 'dip',
  halter: 'dumbbell',
  halteres: 'dumbbell',
  barra: 'barbell',
  polia: 'cable',
  cabo: 'cable',
  maquina: 'machine',
  reto: 'flat',
  inclinado: 'incline',
  inclinada: 'incline',
  declinado: 'decline',
  alternada: 'alternate',
  alternado: 'alternate',
  martelo: 'hammer',
  sentado: 'seated',
  sentada: 'seated',
  deitado: 'lying',
  deitada: 'lying',
  unilateral: 'one arm',
  costas: 'back',
  peito: 'chest',
  ombro: 'shoulder',
  ombros: 'shoulder',
  gluteo: 'glute',
  gluteos: 'glute',
  triceps: 'triceps',
  biceps: 'biceps',
};
export function matchesExercise(e: CatalogExercise, query: string) {
  const q = normalize(query).replace(/\bc\//g, 'com').replace(/-/g, ' ');
  if (!q) return true;
  const exactAliases = Object.entries(exerciseAliases).filter(([, aliases]) =>
    aliases.some((alias) => normalize(alias).replace(/\bc\//g, 'com').replace(/-/g, ' ') === q),
  );
  if (exactAliases.length) return exactAliases.some(([id]) => id === legacyCatalogId(e.id));

  const haystack = normalize(
    [
      e.name,
      exerciseName(e),
      ...(exerciseAliases[legacyCatalogId(e.id)] || []),
      ...e.primaryMuscles,
      ...e.secondaryMuscles,
      ...e.primaryMuscles.map((m) => muscleLabels[m] || m),
      ...e.secondaryMuscles.map((m) => muscleLabels[m] || m),
      equipmentLabels[e.equipment] || e.equipment,
    ].join(' '),
  ).replace(/-/g, ' ');
  const raw = q
    .split(' ')
    .filter((w) => !['de', 'do', 'da', 'com', 'a', 'o', 'e', 'no', 'na', 'em'].includes(w));
  if (!raw.length) return true;
  if (raw.every((w) => haystack.includes(w))) return true;
  // Equipment and common movement terms support Portuguese searches; source names stay intact.
  return raw.every((w) => (terms[w] || w).split(' ').every((token) => haystack.includes(token)));
}
export function imageUrl(path: string) {
  if (
    typeof path === 'string' &&
    /^https:\/\/static\.exercisedb\.dev\/media\/[A-Za-z0-9_-]{1,160}\.gif$/.test(path)
  )
    return path;
  return typeof path === 'string' &&
    /^[A-Za-z0-9_.-]+\/[0-9]+\.(jpg|png|webp)$/.test(path) &&
    !path.includes('..')
    ? IMAGE_ROOT + path
    : null;
}
export function parseCatalog(value: unknown): CatalogExercise[] {
  if (!Array.isArray(value) || value.length > 10000)
    throw new Error('O catálogo retornou um formato inválido.');
  const strings = (value: unknown, max: number) =>
    Array.isArray(value)
      ? value.filter((x): x is string => typeof x === 'string').slice(0, max)
      : [];
  const seen = new Set<string>();
  const result: CatalogExercise[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== 'string' ||
      !/^[A-Za-z0-9_.-]{1,160}$/.test(e.id) ||
      typeof e.name !== 'string' ||
      !e.name.trim() ||
      e.name.length > 120 ||
      seen.has(e.id)
    )
      continue;
    seen.add(e.id);
    result.push({
      provider: e.provider === 'exercisedb' ? 'exercisedb' : 'free-exercise-db',
      id: e.id,
      name: e.name,
      equipment: typeof e.equipment === 'string' ? e.equipment : 'other',
      primaryMuscles: strings(e.primaryMuscles, 20),
      secondaryMuscles: strings(e.secondaryMuscles, 20),
      instructions: strings(e.instructions, 30).map((s) => s.slice(0, 1500)),
      images: strings(e.images, 2).filter((p) =>
        e.provider === 'exercisedb'
          ? p === `https://static.exercisedb.dev/media/${String(e.id).replace(/^edb_/, '')}.gif` &&
            !!imageUrl(p)
          : p.startsWith(e.id + '/') && !!imageUrl(p),
      ),
      level: typeof e.level === 'string' ? e.level : '',
      category: typeof e.category === 'string' ? e.category : '',
    });
  }
  if (!result.length) throw new Error('O catálogo não trouxe exercícios utilizáveis.');
  return result;
}
export function parseAnimatedCatalog(value: unknown): CatalogExercise[] {
  if (!Array.isArray(value)) throw new Error('Resposta inválida da biblioteca animada.');
  const muscles: Record<string, string> = {
    pectorals: 'chest',
    deltoids: 'shoulders',
    trapezius: 'traps',
    'erector spinae': 'lower back',
    'latissimus dorsi': 'lats',
    'gluteus maximus': 'glutes',
    'gluteus medius': 'glutes',
    soleus: 'calves',
    gastrocnemius: 'calves',
    quads: 'quadriceps',
    'upper back': 'middle back',
    spine: 'lower back',
  };
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return parseCatalog(
    value.map((raw) => {
      const e = raw as Record<string, unknown>;
      if (!e || typeof e.exerciseId !== 'string') return null;
      return {
        provider: 'exercisedb',
        id: 'edb_' + e.exerciseId,
        name: e.name,
        equipment:
          list(e.equipments)[0] === 'bodyweight' ? 'body only' : list(e.equipments)[0] || 'other',
        primaryMuscles: list(e.targetMuscles).map((m) => muscles[m] || m),
        secondaryMuscles: list(e.secondaryMuscles).map((m) => muscles[m] || m),
        instructions: list(e.instructions).map((t) => t.replace(/^Step:\s*\d+\s*/i, '')),
        images: [e.gifUrl],
        level: '',
        category: 'strength',
      };
    }),
  ).filter((e) => e.images.length > 0);
}
let starterMemory: CatalogExercise[] | null = null;
const duplicateCatalogIds = new Map<string, string>();
function ensureCatalog() {
  if (starterMemory) return starterMemory;
  const rows = parseCatalog([...animatedStarter, ...supplementalCatalog]).filter(
    (e) => e.images.length > 0,
  );
  const unique = new Map<string, CatalogExercise>();
  for (const row of rows) {
    const key = [
      normalize(exerciseName(row)),
      row.equipment,
      [...row.primaryMuscles].sort().join(','),
    ].join('|');
    const existing = unique.get(key);
    if (existing) duplicateCatalogIds.set(row.id, existing.id);
    else unique.set(key, row);
  }
  starterMemory = [...unique.values()];
  if (!starterMemory.length) throw new Error('Biblioteca animada indisponível.');
  return starterMemory;
}
export async function loadCatalog(): Promise<{ rows: CatalogExercise[]; cached: boolean }> {
  return { rows: ensureCatalog(), cached: false };
}
export function catalogReference(e: CatalogExercise): CatalogReference {
  return {
    provider: e.provider || 'free-exercise-db',
    id: e.id,
    images: e.images,
    instructions: e.instructions.join('\n\n').slice(0, 3000),
  };
}
