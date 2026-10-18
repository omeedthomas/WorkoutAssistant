import { exerciseById, treeById, type TreeId } from '../data';
import type { WorkoutLength } from '../lib/workout';

export interface LogEntry {
  id: string;
  /** ISO timestamp. */
  date: string;
  /** The local calendar day it was logged on (YYYY-MM-DD), so every device files it under the same day. */
  day?: string;
  sets: number;
  /** Reps or seconds achieved in each set. */
  value: number;
  /** What the app suggested for this session, so we can tell a hit from a miss. */
  planned?: { sets: number; value: number };
}

/** A workout started from the Workout page. */
export interface WorkoutRecord {
  title: string;
  focus: TreeId[];
  length: WorkoutLength;
  startedAt: string;
  finishedAt?: string;
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
  | { type: 'toggleGoal'; id: string }
  | { type: 'applyStartingPoint'; master: string[]; unmaster: string[]; at: string }
  | { type: 'setOnboarded' }
  | { type: 'recordWorkout'; day: string; record: WorkoutRecord }
  | { type: 'finishWorkout'; day: string; startedAt: string; at: string }
  | { type: 'removeWorkout'; day: string; startedAt: string }
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
        list.map((w) => (w.startedAt === action.startedAt ? { ...w, finishedAt: action.at } : w)),
      );
    }

    case 'removeWorkout': {
      const list = state.workouts[action.day];
      if (!list) return state;
      return setDayWorkouts(state, action.day, list.filter((w) => w.startedAt !== action.startedAt));
    }

    case 'reset':
      return { ...initialProgress, onboarded: state.onboarded };

    case 'replace':
      return action.state;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

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
        const p = l.planned;
        if (isRecord(p) && isPositive(p.sets) && isPositive(p.value)) entry.planned = { sets: p.sets, value: p.value };
        valid.push(entry);
      }
      if (valid.length) logs[id] = valid.slice(0, MAX_LOGS_PER_EXERCISE);
    }
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
        valid.push(record);
      }
      if (valid.length) workouts[day] = valid;
    }
  }

  return { version: 1, mastered, logs, goals, onboarded: raw.onboarded === true, workouts };
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
