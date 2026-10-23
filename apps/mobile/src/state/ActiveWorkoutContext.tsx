import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Workout } from '@ascent/core/lib/workout';
import { restoreActiveWorkout, snapshot, type ActiveExercise, type ActiveWorkout } from '@ascent/core/state/activeWorkout';
import { readJson, writeJson } from './storage';

export const WORKOUT_KEY = 'ascent:workout:v1';

export interface ActiveWorkoutApi {
  /** Today's started workout, if any. It's a snapshot, so logging mid-workout doesn't reshuffle it. */
  active: ActiveWorkout | null;
  /** Starts the workout and returns the snapshot (its `startedAt` identifies it). */
  start: (w: Workout) => ActiveWorkout;
  end: () => void;
  checkDrill: (id: string) => void;
  markLogged: (exerciseId: string, logged: ActiveExercise['logged']) => void;
  setPosition: (position: number) => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutApi | null>(null);

export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void readJson(WORKOUT_KEY).then((raw) => {
      setActive(restoreActiveWorkout(raw));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) void writeJson(WORKOUT_KEY, active);
  }, [active, loaded]);

  const api = useMemo<ActiveWorkoutApi>(
    () => ({
      active,
      start(w) {
        const started = snapshot(w);
        setActive(started);
        return started;
      },
      end: () => setActive(null),
      checkDrill: (id) => setActive((w) => w && (w.checked.includes(id) ? w : { ...w, checked: [...w.checked, id] })),
      markLogged: (exerciseId, logged) =>
        setActive((w) => w && { ...w, main: w.main.map((m) => (m.exerciseId === exerciseId ? { ...m, logged } : m)) }),
      setPosition: (position) => setActive((w) => (w && w.position !== position ? { ...w, position } : w)),
    }),
    [active],
  );

  if (!loaded) return null;
  return <ActiveWorkoutContext.Provider value={api}>{children}</ActiveWorkoutContext.Provider>;
}

export function useActiveWorkout(): ActiveWorkoutApi {
  const ctx = useContext(ActiveWorkoutContext);
  if (!ctx) throw new Error('useActiveWorkout must be used inside <ActiveWorkoutProvider>');
  return ctx;
}
