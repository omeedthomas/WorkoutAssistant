import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Exercise } from '@ascent/core/data';
import { missingAncestors, newlyUnlocked } from '@ascent/core/lib/graph';
import type { Units } from '@ascent/core/lib/units';
import {
  initialProgress,
  localDay,
  makeId,
  progressReducer,
  sanitizeProgress,
  type LogEntry,
  type ProgressState,
  type Work,
  type WorkoutPlan,
  type WorkoutRecord,
} from '@ascent/core/state/progress';
import { readJson, writeJson } from './storage';

/** Same key and format as the web app, so a future Drive sync reads and writes the same documents. */
const STORAGE_KEY = 'ascent:progress:v1';

export interface ProgressApi {
  state: ProgressState;
  /** Marks the exercise (and optionally its missing prerequisites) mastered. Returns newly unlocked skills. */
  master: (id: string, opts?: { includeAncestors?: boolean }) => Exercise[];
  unmaster: (id: string) => void;
  /** Logs a session and returns its id. */
  log: (id: string, done: Work, planned?: Work) => string;
  deleteLog: (id: string, logId: string) => void;
  toggleGoal: (id: string) => void;
  recordWorkout: (record: WorkoutRecord) => void;
  finishWorkout: (startedAt: string, kcal?: number) => void;
  removeWorkout: (startedAt: string) => void;
  setUnits: (units: Units) => void;
  /** Saves the areas you train and how long, for Today's workout. */
  setWorkoutPlan: (plan: Omit<WorkoutPlan, 'at'> | null) => void;
  reset: () => void;
  /** Replaces everything, e.g. with the copy downloaded or merged from Google Drive. */
  replaceState: (state: ProgressState) => void;
}

const ProgressContext = createContext<ProgressApi | null>(null);

/** The progress saved on this phone, loaded once at startup (children wait until it's in). */
export function ProgressProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [state, dispatch] = useReducer(progressReducer, initialProgress);
  const [loaded, setLoaded] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    void readJson(STORAGE_KEY).then((raw) => {
      const saved = raw === null ? null : sanitizeProgress(raw);
      if (saved) dispatch({ type: 'replace', state: saved });
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // The first render after loading is what was just read: no need to write it back.
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    void writeJson(STORAGE_KEY, state);
  }, [state, loaded]);

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
      recordWorkout: (record) => dispatch({ type: 'recordWorkout', day: localDay(record.startedAt), record }),
      finishWorkout: (startedAt, kcal) =>
        dispatch({ type: 'finishWorkout', day: localDay(startedAt), startedAt, at: now(), kcal }),
      removeWorkout: (startedAt) => dispatch({ type: 'removeWorkout', day: localDay(startedAt), startedAt }),
      setUnits: (units) => dispatch({ type: 'setUnits', units }),
      setWorkoutPlan: (plan) => dispatch({ type: 'setWorkoutPlan', plan: plan && { ...plan, at: now() } }),
      reset: () => dispatch({ type: 'reset' }),
      replaceState: (next) => dispatch({ type: 'replace', state: next }),
    };
  }, [state]);

  if (!loaded) return <>{fallback ?? null}</>;
  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
