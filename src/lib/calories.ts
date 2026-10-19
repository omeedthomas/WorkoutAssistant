import { exerciseById } from '../data';
import { drillById, type Drill } from '../data/drills';
import type { ActiveWorkout } from '../state/activeWorkout';
import type { WorkoutRecord } from '../state/progress';
import { sessionsByWorkout, type DaySession, type DaySummary } from './history';
import { exerciseSeconds, LENGTHS, type Workout } from './workout';

/**
 * Calorie estimates from MET values (Compendium of Physical Activities):
 * kcal per minute = MET × 3.5 × body weight (kg) ÷ 200. Strength work counts
 * its rest periods, so it uses a moderate MET rather than a "vigorous" one.
 */
const MET = { warmup: 3.5, main: 5, cooldown: 2.3 };

/** Used until a body weight is logged. */
export const DEFAULT_BODY_KG = 75;

function kcal(met: number, kg: number, seconds: number): number {
  return ((met * 3.5 * kg) / 200) * (seconds / 60);
}

const drillSeconds = (list: Drill[]) => list.reduce((s, d) => s + d.seconds, 0);

/** The whole planned workout. */
export function workoutCalories(w: Workout, kg: number): number {
  const main = w.main.reduce((s, m) => s + exerciseSeconds(m.exercise, m.plan.sets, m.plan.value), 0);
  return Math.round(
    kcal(MET.warmup, kg, drillSeconds(w.warmup)) + kcal(MET.main, kg, main) + kcal(MET.cooldown, kg, drillSeconds(w.cooldown)),
  );
}

/** What's been done so far in a started workout: ticked drills and logged exercises. */
export function activeCalories(w: ActiveWorkout, kg: number): number {
  const ticked = (ids: string[]) => drillSeconds(ids.filter((id) => w.checked.includes(id)).map((id) => drillById[id]));
  const main = w.main.reduce((s, m) => {
    const ex = exerciseById[m.exerciseId];
    return m.logged && ex ? s + exerciseSeconds(ex, m.logged.sets, m.logged.value) : s;
  }, 0);
  return Math.round(kcal(MET.warmup, kg, ticked(w.warmup)) + kcal(MET.main, kg, main) + kcal(MET.cooldown, kg, ticked(w.cooldown)));
}

/** Logged sessions, outside of any planned workout. */
export function sessionsCalories(sessions: DaySession[], kg: number): number {
  const seconds = sessions.reduce((s, { exercise, log }) => s + exerciseSeconds(exercise, log.sets, log.value), 0);
  return Math.round(kcal(MET.main, kg, seconds));
}

/**
 * A recorded workout: its saved estimate, or one rebuilt from the sessions
 * logged during it plus a typical warm-up and cooldown for its length.
 */
export function recordCalories(w: WorkoutRecord, sessions: DaySession[], kg: number): number {
  if (w.kcal !== undefined) return w.kcal;
  if (!sessions.length) return 0;
  const len = LENGTHS[w.length];
  return Math.round(
    kcal(MET.warmup, kg, len.warmup * 60) + sessionsCalories(sessions, kg) + kcal(MET.cooldown, kg, len.cooldown * 45),
  );
}

/** Everything trained on one day. */
export function dayCalories(summary: DaySummary, kg: number): number {
  const { workouts, other } = sessionsByWorkout(summary);
  return workouts.reduce((s, w) => s + recordCalories(w.workout, w.sessions, kg), 0) + sessionsCalories(other, kg);
}
