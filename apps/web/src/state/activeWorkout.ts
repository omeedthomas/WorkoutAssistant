import { useEffect, useState } from 'react';
import { restoreActiveWorkout, snapshot, swapExercise, type ActiveExercise, type ActiveWorkout } from '@ascent/core/state/activeWorkout';
import type { ProgressState } from '@ascent/core/state/progress';
import type { Workout } from '@ascent/core/lib/workout';

export * from '@ascent/core/state/activeWorkout';

/** The started workout (see core's `ActiveWorkout`), kept in this browser's localStorage. */
const KEY = 'ascent:workout:v1';

function load(): ActiveWorkout | null {
  try {
    return restoreActiveWorkout(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return null;
  }
}

/** Read-only peek for other pages (e.g. "Continue workout" on Home). */
export function loadActiveWorkout(): ActiveWorkout | null {
  return load();
}

/** Starts a workout from outside the Workout page (e.g. Home); the Workout page picks it up when it opens. */
export function saveActiveWorkout(w: ActiveWorkout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    // storage unavailable: nothing to hand over
  }
}

/** Forgets the started workout, e.g. on sign-out, since it belongs to that account. */
export function clearActiveWorkout() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: nothing was saved
  }
}

export function useActiveWorkout() {
  const [active, setActive] = useState<ActiveWorkout | null>(load);

  useEffect(() => {
    try {
      if (active) localStorage.setItem(KEY, JSON.stringify(active));
      else localStorage.removeItem(KEY);
    } catch {
      // storage unavailable: the workout lives for this page view only
    }
  }, [active]);

  return {
    active,
    /** Starts the workout and returns the snapshot (its `startedAt` identifies it). */
    start: (w: Workout) => {
      const started = snapshot(w);
      setActive(started);
      return started;
    },
    end: () => setActive(null),
    toggleDrill: (id: string) =>
      setActive((w) =>
        w && { ...w, checked: w.checked.includes(id) ? w.checked.filter((c) => c !== id) : [...w.checked, id] },
      ),
    checkDrill: (id: string) => setActive((w) => w && (w.checked.includes(id) ? w : { ...w, checked: [...w.checked, id] })),
    markLogged: (exerciseId: string, logged: ActiveExercise['logged']) =>
      setActive((w) => w && { ...w, main: w.main.map((m) => (m.exerciseId === exerciseId ? { ...m, logged } : m)) }),
    /** Opens the guided player (at `position`, when given) or goes back to the list. */
    setGuided: (guided: boolean, position?: number) =>
      setActive((w) => w && { ...w, guided, ...(position !== undefined && { position }) }),
    setPosition: (position: number) => setActive((w) => (w && w.position !== position ? { ...w, position } : w)),
    /** Switches an exercise not logged yet for another (an easier step, or back), planned from `state`. */
    swap: (fromId: string, toId: string, state: ProgressState) => setActive((w) => w && swapExercise(w, fromId, toId, state)),
  };
}
