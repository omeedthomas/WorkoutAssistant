import type { Work } from '../state/progress';

/**
 * Sets don't always go to plan: 10 reps, then 9, then 8. A session keeps each set in `perSet` when they differ,
 * and `value` is what every set reached (the lowest), so "did you hit 3 × 10?" stays an honest check everywhere
 * that compares a session with a plan or target. Anything that adds the work up (totals, calories, growth) goes
 * through these helpers instead of `sets × value`.
 */

/** Reps (or seconds) of each set, in order. */
export function setValues(w: Work): number[] {
  return w.perSet?.length === w.sets ? w.perSet : Array.from({ length: w.sets }, () => w.value);
}

/** Every set's reps (or seconds) added up. */
export const totalWork = (w: Work): number => setValues(w).reduce((sum, v) => sum + v, 0);

/** The average set's reps (or seconds). */
export const averageSet = (w: Work): number => totalWork(w) / w.sets;

/** A session of these sets (at least one), keeping `perSet` only when they differ. */
export function workFromSets(values: number[], addedKg?: number): Work {
  const value = Math.min(...values);
  return {
    sets: values.length,
    value,
    ...(values.some((v) => v !== value) && { perSet: [...values] }),
    ...(addedKg !== undefined && { addedKg }),
  };
}
