import { exerciseById, exercises, trackByKey, treeById, type Equipment, type TreeId } from '../data';
import { equipmentById } from '../data/equipment';
import { routineById } from '../data/routines';
import type { Units } from '../lib/units';
import type { WorkoutLength } from '../lib/workout';

/** What was done (or planned) in one session: sets of reps or seconds, plus any added weight. */
export interface Work {
  sets: number;
  /** Reps or seconds per set. When the sets differed (`perSet`), the lowest: what every set reached. */
  value: number;
  /** Reps or seconds of each set, in order, when they weren't all the same (see `lib/sets.ts`). */
  perSet?: number[];
  /** Weighted exercises: added weight in kg (0 = none). */
  addedKg?: number;
}

/** You said a session was too easy or too hard: the next plan for that exercise steps up or eases off. */
export type Feel = 'easy' | 'hard';
export const FEELS: Feel[] = ['easy', 'hard'];

/** How a whole workout felt, asked when you finish it. */
export type WorkoutRating = 'easy' | 'right' | 'hard';
export const WORKOUT_RATINGS: WorkoutRating[] = ['easy', 'right', 'hard'];

export interface LogEntry extends Work {
  id: string;
  /** ISO timestamp. */
  date: string;
  /** The local calendar day it was logged on (YYYY-MM-DD), so every device files it under the same day. */
  day?: string;
  /** What the app suggested for this session, so we can tell a hit from a miss. */
  planned?: Work;
  /** Too easy or too hard, if you said so after the workout. */
  feel?: Feel;
  /** When the numbers or the feel were last changed (ISO), so the newest change wins across devices. */
  edited?: string;
}

/** A workout started from the Workout page. */
export interface WorkoutRecord {
  title: string;
  focus: TreeId[];
  length: WorkoutLength;
  startedAt: string;
  finishedAt?: string;
  /** Estimated calories burned, worked out when the workout is finished. */
  kcal?: number;
  /** How it felt, if you said when you finished it. */
  rating?: WorkoutRating;
  /** Set for a daily mobility routine (its id in `data/routines.ts`) rather than a training workout. */
  routine?: string;
}

/** A body-weight entry. `at` (ISO) decides which wins when two devices log the same day. */
export interface WeighIn {
  kg: number;
  at: string;
}

export interface WeightGoal {
  kg: number;
  /** When it was set (ISO). */
  at: string;
}

/** The gear you have, so workouts only include what you can do. */
export interface OwnedEquipment {
  have: Equipment[];
  /** When it was last changed (ISO), so the newest wins across devices. */
  at: string;
}

/** The areas you train and how long you like to train: Home builds today's workout from it. */
export interface WorkoutPlan {
  focus: TreeId[];
  length: WorkoutLength;
  /** When it was saved (ISO), so the newest wins across devices. */
  at: string;
}

export interface ProgressState {
  version: 1;
  /** Exercise id → ISO timestamp when it was mastered. */
  mastered: Record<string, string>;
  /** Exercise id → logged sessions, newest first. */
  logs: Record<string, LogEntry[]>;
  goals: string[];
  onboarded: boolean;
  /** Local day (YYYY-MM-DD) → workouts started that day. */
  workouts: Record<string, WorkoutRecord[]>;
  /** Local day (YYYY-MM-DD) → body weight logged that day. */
  weight: Record<string, WeighIn>;
  weightGoal: WeightGoal | null;
  /** How weights are shown. They're always stored in kg. */
  units: Units;
  workoutPlan: WorkoutPlan | null;
  /** Null until you say what you have; until then nothing is filtered out. */
  equipment: OwnedEquipment | null;
}

export const MAX_GOALS = 5;
/** Generous: older sessions beyond this would also drop out of the cloud copy. */
export const MAX_LOGS_PER_EXERCISE = 500;

export const initialProgress: ProgressState = {
  version: 1,
  mastered: {},
  logs: {},
  goals: [],
  onboarded: false,
  workouts: {},
  weight: {},
  weightGoal: null,
  units: 'lb',
  workoutPlan: null,
  equipment: null,
};

/** Local calendar day, e.g. "2026-10-18". */
export function localDay(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type ProgressAction =
  | { type: 'master'; ids: string[]; at: string }
  | { type: 'unmaster'; id: string }
  | { type: 'log'; exerciseId: string; entry: LogEntry }
  | { type: 'deleteLog'; exerciseId: string; logId: string }
  | { type: 'editLog'; exerciseId: string; logId: string; work: Work; at: string }
  | { type: 'rateLog'; exerciseId: string; logId: string; feel: Feel | null; at: string }
  | { type: 'toggleGoal'; id: string }
  | { type: 'applyStartingPoint'; master: string[]; unmaster: string[]; at: string }
  | { type: 'setOnboarded' }
  | { type: 'recordWorkout'; day: string; record: WorkoutRecord }
  | { type: 'finishWorkout'; day: string; startedAt: string; at: string; kcal?: number; rating?: WorkoutRating }
  | { type: 'removeWorkout'; day: string; startedAt: string }
  | { type: 'logWeight'; day: string; entry: WeighIn }
  | { type: 'deleteWeight'; day: string }
  | { type: 'setWeightGoal'; goal: WeightGoal | null }
  | { type: 'setUnits'; units: Units }
  | { type: 'setWorkoutPlan'; plan: WorkoutPlan | null }
  | { type: 'setEquipment'; equipment: OwnedEquipment | null }
  | { type: 'reset' }
  | { type: 'replace'; state: ProgressState };

function masterAll(mastered: Record<string, string>, ids: string[], at: string) {
  const next = { ...mastered };
  for (const id of ids) if (exerciseById[id] && !next[id]) next[id] = at;
  return next;
}

function setDayWorkouts(state: ProgressState, day: string, list: WorkoutRecord[]): ProgressState {
  const workouts = { ...state.workouts };
  if (list.length) workouts[day] = list;
  else delete workouts[day];
  return { ...state, workouts };
}

export function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'master':
      return { ...state, mastered: masterAll(state.mastered, action.ids, action.at) };

    case 'unmaster': {
      if (!state.mastered[action.id]) return state;
      const mastered = { ...state.mastered };
      delete mastered[action.id];
      return { ...state, mastered };
    }

    case 'log': {
      if (!exerciseById[action.exerciseId]) return state;
      const existing = state.logs[action.exerciseId] ?? [];
      const list = [action.entry, ...existing].slice(0, MAX_LOGS_PER_EXERCISE);
      return { ...state, logs: { ...state.logs, [action.exerciseId]: list } };
    }

    case 'deleteLog': {
      const existing = state.logs[action.exerciseId];
      if (!existing) return state;
      const list = existing.filter((l) => l.id !== action.logId);
      const logs = { ...state.logs };
      if (list.length) logs[action.exerciseId] = list;
      else delete logs[action.exerciseId];
      return { ...state, logs };
    }

    case 'editLog': {
      const existing = state.logs[action.exerciseId];
      if (!existing?.some((l) => l.id === action.logId)) return state;
      const w = action.work;
      const list = existing.map((l): LogEntry => {
        if (l.id !== action.logId) return l;
        const entry: LogEntry = { ...l, sets: w.sets, value: w.value, edited: action.at };
        if (w.perSet) entry.perSet = w.perSet;
        else delete entry.perSet;
        if (w.addedKg !== undefined) entry.addedKg = w.addedKg;
        else delete entry.addedKg;
        return entry;
      });
      return { ...state, logs: { ...state.logs, [action.exerciseId]: list } };
    }

    case 'rateLog': {
      const existing = state.logs[action.exerciseId];
      if (!existing?.some((l) => l.id === action.logId)) return state;
      const list = existing.map((l): LogEntry => {
        if (l.id !== action.logId) return l;
        const entry: LogEntry = { ...l, edited: action.at };
        if (action.feel) entry.feel = action.feel;
        else delete entry.feel;
        return entry;
      });
      return { ...state, logs: { ...state.logs, [action.exerciseId]: list } };
    }

    case 'toggleGoal': {
      if (state.goals.includes(action.id)) {
        return { ...state, goals: state.goals.filter((g) => g !== action.id) };
      }
      if (!exerciseById[action.id] || state.goals.length >= MAX_GOALS) return state;
      return { ...state, goals: [...state.goals, action.id] };
    }

    case 'applyStartingPoint': {
      const mastered = { ...state.mastered };
      for (const id of action.unmaster) delete mastered[id];
      return {
        ...state,
        mastered: masterAll(mastered, action.master, action.at),
        onboarded: true,
      };
    }

    case 'setOnboarded':
      return state.onboarded ? state : { ...state, onboarded: true };

    case 'recordWorkout': {
      const list = state.workouts[action.day] ?? [];
      if (list.some((w) => w.startedAt === action.record.startedAt)) return state;
      return setDayWorkouts(state, action.day, [...list, action.record]);
    }

    case 'finishWorkout': {
      const list = state.workouts[action.day];
      if (!list) return state;
      return setDayWorkouts(
        state,
        action.day,
        list.map((w) =>
          w.startedAt === action.startedAt
            ? {
                ...w,
                finishedAt: action.at,
                ...(action.kcal !== undefined && { kcal: action.kcal }),
                ...(action.rating && { rating: action.rating }),
              }
            : w,
        ),
      );
    }

    case 'removeWorkout': {
      const list = state.workouts[action.day];
      if (!list) return state;
      return setDayWorkouts(state, action.day, list.filter((w) => w.startedAt !== action.startedAt));
    }

    case 'logWeight':
      return { ...state, weight: { ...state.weight, [action.day]: action.entry } };

    case 'deleteWeight': {
      if (!state.weight[action.day]) return state;
      const weight = { ...state.weight };
      delete weight[action.day];
      return { ...state, weight };
    }

    case 'setWeightGoal':
      return { ...state, weightGoal: action.goal };

    case 'setUnits':
      return state.units === action.units ? state : { ...state, units: action.units };

    case 'setWorkoutPlan':
      return { ...state, workoutPlan: action.plan };

    case 'setEquipment':
      return { ...state, equipment: action.equipment };

    case 'reset':
      // Preferences about you and your setup survive a reset of your progress.
      return { ...initialProgress, onboarded: state.onboarded, units: state.units, equipment: state.equipment };

    case 'replace':
      return action.state;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
/** Added weight on an exercise, in kg. */
const isLoad = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 500;
/** A plausible body weight, in kg. */
const isBodyWeight = (v: unknown): v is number => isPositive(v) && v >= 20 && v <= 400;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LENGTHS: WorkoutLength[] = ['short', 'standard', 'long'];

/**
 * Validates data loaded from storage, an import file or the cloud. Unknown
 * exercises (e.g. removed from the catalog) are dropped rather than failing the load.
 */
export function sanitizeProgress(raw: unknown): ProgressState | null {
  if (!isRecord(raw) || raw.version !== 1) return null;

  const mastered: Record<string, string> = {};
  if (isRecord(raw.mastered)) {
    for (const [id, at] of Object.entries(raw.mastered)) {
      if (exerciseById[id] && typeof at === 'string') mastered[id] = at;
    }
  }

  const logs: Record<string, LogEntry[]> = {};
  if (isRecord(raw.logs)) {
    for (const [id, list] of Object.entries(raw.logs)) {
      if (!exerciseById[id] || !Array.isArray(list)) continue;
      const valid: LogEntry[] = [];
      for (const l of list) {
        if (!isRecord(l) || typeof l.id !== 'string' || typeof l.date !== 'string') continue;
        if (!isPositive(l.sets) || !isPositive(l.value)) continue;
        const entry: LogEntry = { id: l.id, date: l.date, sets: l.sets, value: l.value };
        if (typeof l.day === 'string' && DAY_RE.test(l.day)) entry.day = l.day;
        // Each set's reps must match the set count; `value` then follows from them.
        if (Array.isArray(l.perSet) && l.perSet.length === l.sets && l.perSet.every(isPositive)) {
          entry.perSet = [...l.perSet];
          entry.value = Math.min(...l.perSet);
        }
        if (isLoad(l.addedKg)) entry.addedKg = l.addedKg;
        if (FEELS.includes(l.feel as Feel)) entry.feel = l.feel as Feel;
        if (typeof l.edited === 'string') entry.edited = l.edited;
        const p = l.planned;
        if (isRecord(p) && isPositive(p.sets) && isPositive(p.value)) {
          entry.planned = { sets: p.sets, value: p.value, ...(isLoad(p.addedKg) && { addedKg: p.addedKg }) };
        }
        valid.push(entry);
      }
      if (valid.length) logs[id] = valid.slice(0, MAX_LOGS_PER_EXERCISE);
    }
  }

  // A step added to a progression later (`addedAt`) never sends anyone back down it: if you'd already reached a
  // later step of its track (mastered or logged one), it counts as mastered from then.
  for (const ex of exercises) {
    if (!ex.addedAt || mastered[ex.id]) continue;
    const reached = trackByKey[ex.track].steps
      .slice(ex.step + 1)
      .flatMap((s) => [mastered[s.id], ...(logs[s.id] ?? []).map((l) => l.date)])
      .filter((d): d is string => !!d)
      .sort();
    if (reached.length) mastered[ex.id] = reached[0];
  }

  const goals = Array.isArray(raw.goals)
    ? [...new Set(raw.goals.filter((g): g is string => typeof g === 'string' && !!exerciseById[g]))].slice(
        0,
        MAX_GOALS,
      )
    : [];

  const workouts: Record<string, WorkoutRecord[]> = {};
  if (isRecord(raw.workouts)) {
    for (const [day, list] of Object.entries(raw.workouts)) {
      if (!DAY_RE.test(day) || !Array.isArray(list)) continue;
      const valid: WorkoutRecord[] = [];
      for (const w of list) {
        if (!isRecord(w) || typeof w.title !== 'string' || typeof w.startedAt !== 'string') continue;
        if (!Array.isArray(w.focus) || !LENGTHS.includes(w.length as WorkoutLength)) continue;
        const record: WorkoutRecord = {
          title: w.title,
          focus: w.focus.filter((t): t is TreeId => typeof t === 'string' && t in treeById),
          length: w.length as WorkoutLength,
          startedAt: w.startedAt,
        };
        if (typeof w.finishedAt === 'string') record.finishedAt = w.finishedAt;
        if (isPositive(w.kcal)) record.kcal = Math.round(w.kcal);
        if (WORKOUT_RATINGS.includes(w.rating as WorkoutRating)) record.rating = w.rating as WorkoutRating;
        if (typeof w.routine === 'string' && routineById[w.routine]) record.routine = w.routine;
        valid.push(record);
      }
      if (valid.length) workouts[day] = valid;
    }
  }

  const weight: Record<string, WeighIn> = {};
  if (isRecord(raw.weight)) {
    for (const [day, w] of Object.entries(raw.weight)) {
      if (DAY_RE.test(day) && isRecord(w) && isBodyWeight(w.kg) && typeof w.at === 'string') weight[day] = { kg: w.kg, at: w.at };
    }
  }

  const g = raw.weightGoal;
  const weightGoal = isRecord(g) && isBodyWeight(g.kg) && typeof g.at === 'string' ? { kg: g.kg, at: g.at } : null;

  const rawPlan = raw.workoutPlan;
  const planFocus =
    isRecord(rawPlan) && Array.isArray(rawPlan.focus)
      ? [...new Set(rawPlan.focus.filter((t): t is TreeId => typeof t === 'string' && t in treeById))]
      : [];
  const workoutPlan: WorkoutPlan | null =
    isRecord(rawPlan) && planFocus.length && LENGTHS.includes(rawPlan.length as WorkoutLength) && typeof rawPlan.at === 'string'
      ? { focus: planFocus, length: rawPlan.length as WorkoutLength, at: rawPlan.at }
      : null;

  return {
    version: 1,
    mastered,
    logs,
    goals,
    onboarded: raw.onboarded === true,
    workouts,
    weight,
    weightGoal,
    units: raw.units === 'kg' ? 'kg' : 'lb',
    workoutPlan,
    equipment:
      isRecord(raw.equipment) && Array.isArray(raw.equipment.have) && typeof raw.equipment.at === 'string'
        ? {
            have: [...new Set(raw.equipment.have.filter((e): e is Equipment => typeof e === 'string' && e in equipmentById))],
            at: raw.equipment.at,
          }
        : null,
  };
}

export function makeId(): string {
  // crypto.randomUUID is only available in secure contexts (not on http://<LAN-IP>).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
