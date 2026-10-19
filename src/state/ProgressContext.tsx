import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { Exercise } from '../data';
import { missingAncestors, newlyUnlocked, withAncestors } from '../lib/graph';
import type { Units } from '../lib/units';
import {
  initialProgress,
  localDay,
  makeId,
  progressReducer,
  sanitizeProgress,
  type LogEntry,
  type ProgressState,
  type OwnedEquipment,
  type Work,
  type WorkoutPlan,
  type WorkoutRecord,
} from './progress';

const STORAGE_KEY = 'ascent:progress:v1';

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialProgress;
    return sanitizeProgress(JSON.parse(raw)) ?? initialProgress;
  } catch {
    return initialProgress;
  }
}

export interface ProgressApi {
  state: ProgressState;
  /** Marks the exercise (and optionally its missing prerequisites) mastered. Returns newly unlocked skills. */
  master: (id: string, opts?: { includeAncestors?: boolean }) => Exercise[];
  unmaster: (id: string) => void;
  /** Logs a session and returns its id. */
  log: (id: string, done: Work, planned?: Work) => string;
  deleteLog: (id: string, logId: string) => void;
  toggleGoal: (id: string) => void;
  /** For each chosen exercise, mastered = it + its ancestors; `unmaster` is cleared first. */
  applyStartingPoint: (chosen: string[], unmaster: string[]) => void;
  setOnboarded: () => void;
  /** Records a workout started from the Workout page (filed under its day). */
  recordWorkout: (record: WorkoutRecord) => void;
  finishWorkout: (startedAt: string, kcal?: number) => void;
  removeWorkout: (startedAt: string) => void;
  /** Body weight in kg, for today unless `day` is given. One entry per day; logging again replaces it. */
  logWeight: (kg: number, day?: string) => void;
  deleteWeight: (day: string) => void;
  setWeightGoal: (kg: number | null) => void;
  setUnits: (units: Units) => void;
  /** Saves (or clears) the areas you train and how long, for Home's daily workout. */
  setWorkoutPlan: (plan: Omit<WorkoutPlan, 'at'> | null) => void;
  /** Saves the equipment you have (null forgets it, so nothing is filtered). */
  setEquipment: (have: OwnedEquipment['have'] | null) => void;
  reset: () => void;
  importState: (raw: unknown) => boolean;
}

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(progressReducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked (private mode): progress lives for this session only.
    }
  }, [state]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const next = sanitizeProgress(JSON.parse(e.newValue));
        if (next) dispatch({ type: 'replace', state: next });
      } catch {
        // ignore malformed writes
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const api = useMemo<ProgressApi>(() => {
    const now = () => new Date().toISOString();
    return {
      state,
      master(id, opts = {}) {
        const ids = opts.includeAncestors ? [id, ...missingAncestors(id, state.mastered)] : [id];
        const at = now();
        const after = { ...state.mastered };
        for (const i of ids) after[i] ??= at;
        dispatch({ type: 'master', ids, at });
        return newlyUnlocked(state.mastered, after);
      },
      unmaster: (id) => dispatch({ type: 'unmaster', id }),
      log(id, done, planned) {
        const date = now();
        const entry: LogEntry = { id: makeId(), date, day: localDay(date), sets: done.sets, value: done.value };
        if (done.addedKg !== undefined) entry.addedKg = done.addedKg;
        if (planned) entry.planned = planned;
        dispatch({ type: 'log', exerciseId: id, entry });
        return entry.id;
      },
      deleteLog: (id, logId) => dispatch({ type: 'deleteLog', exerciseId: id, logId }),
      toggleGoal: (id) => dispatch({ type: 'toggleGoal', id }),
      applyStartingPoint: (chosen, unmaster) =>
        dispatch({ type: 'applyStartingPoint', master: withAncestors(chosen), unmaster, at: now() }),
      setOnboarded: () => dispatch({ type: 'setOnboarded' }),
      recordWorkout: (record) => dispatch({ type: 'recordWorkout', day: localDay(record.startedAt), record }),
      finishWorkout: (startedAt, kcal) =>
        dispatch({ type: 'finishWorkout', day: localDay(startedAt), startedAt, at: now(), kcal }),
      removeWorkout: (startedAt) => dispatch({ type: 'removeWorkout', day: localDay(startedAt), startedAt }),
      logWeight: (kg, day = localDay()) => dispatch({ type: 'logWeight', day, entry: { kg, at: now() } }),
      deleteWeight: (day) => dispatch({ type: 'deleteWeight', day }),
      setWeightGoal: (kg) => dispatch({ type: 'setWeightGoal', goal: kg === null ? null : { kg, at: now() } }),
      setUnits: (units) => dispatch({ type: 'setUnits', units }),
      setWorkoutPlan: (plan) => dispatch({ type: 'setWorkoutPlan', plan: plan && { ...plan, at: now() } }),
      setEquipment: (have) => dispatch({ type: 'setEquipment', equipment: have && { have, at: now() } }),
      reset: () => dispatch({ type: 'reset' }),
      importState(raw) {
        const next = sanitizeProgress(raw);
        if (!next) return false;
        dispatch({ type: 'replace', state: next });
        return true;
      },
    };
  }, [state]);

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
