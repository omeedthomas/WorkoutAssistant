import { exerciseById } from '../data';

export interface LogEntry {
  id: string;
  /** ISO timestamp. */
  date: string;
  sets: number;
  /** Reps or seconds achieved in each set. */
  value: number;
  /** What the app suggested for this session, so we can tell a hit from a miss. */
  planned?: { sets: number; value: number };
}

export interface ProgressState {
  version: 1;
  /** Exercise id → ISO timestamp when it was mastered. */
  mastered: Record<string, string>;
  /** Exercise id → logged sessions, newest first. */
  logs: Record<string, LogEntry[]>;
  goals: string[];
  onboarded: boolean;
}

export const MAX_GOALS = 5;
const MAX_LOGS_PER_EXERCISE = 100;

export const initialProgress: ProgressState = {
  version: 1,
  mastered: {},
  logs: {},
  goals: [],
  onboarded: false,
};

export type ProgressAction =
  | { type: 'master'; ids: string[]; at: string }
  | { type: 'unmaster'; id: string }
  | { type: 'log'; exerciseId: string; entry: LogEntry }
  | { type: 'deleteLog'; exerciseId: string; logId: string }
  | { type: 'toggleGoal'; id: string }
  | { type: 'applyStartingPoint'; master: string[]; unmaster: string[]; at: string }
  | { type: 'setOnboarded' }
  | { type: 'reset' }
  | { type: 'replace'; state: ProgressState };

function masterAll(mastered: Record<string, string>, ids: string[], at: string) {
  const next = { ...mastered };
  for (const id of ids) if (exerciseById[id] && !next[id]) next[id] = at;
  return next;
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

    case 'reset':
      return { ...initialProgress, onboarded: state.onboarded };

    case 'replace':
      return action.state;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * Validates data loaded from storage or an import file. Unknown exercises
 * (e.g. removed from the catalog) are dropped rather than failing the load.
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

  return { version: 1, mastered, logs, goals, onboarded: raw.onboarded === true };
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
