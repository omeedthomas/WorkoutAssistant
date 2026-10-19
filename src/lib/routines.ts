import { treeById, type TreeId } from '../data';
import { routineById, routines, type Routine } from '../data/routines';
import { localDay, type ProgressState } from '../state/progress';
import { addDays, daysBetween } from './history';
import { daysSinceTrained } from './workout';

/** Ids of the mobility routines finished on `day`. */
export function routinesDoneOn(state: ProgressState, day: string): string[] {
  return (state.workouts[day] ?? []).filter((w) => w.routine && w.finishedAt).map((w) => w.routine!);
}

/** How many of the last `days` days (today included) had at least one routine finished. */
export function routineDaysInLast(state: ProgressState, days: number, now = new Date()): number {
  const today = localDay(now);
  let count = 0;
  for (let i = 0; i < days; i++) if (routinesDoneOn(state, addDays(today, -i)).length) count++;
  return count;
}

/** The last day each routine was finished. */
export function lastDoneByRoutine(state: ProgressState): Map<string, string> {
  const last = new Map<string, string>();
  for (const [day, list] of Object.entries(state.workouts)) {
    for (const w of list) {
      if (!w.routine || !w.finishedAt || !routineById[w.routine]) continue;
      const prev = last.get(w.routine);
      if (!prev || day > prev) last.set(w.routine, day);
    }
  }
  return last;
}

/** Training areas each routine is a good follow-up to. */
const HELPS_AFTER: Record<string, TreeId[]> = {
  'wake-up': [],
  'upper-back': ['pull', 'levers', 'muscle-up', 'lower-back'],
  shoulders: ['push', 'handstand', 'planche', 'shoulder', 'breakdance'],
  hips: ['legs', 'hips', 'core', 'breakdance'],
  legs: ['legs', 'mobility'],
};

export interface RoutineSuggestion {
  routine: Routine;
  reason: string;
}

/**
 * Today's pick: the routine you've gone longest without (never-done ones first), nudged toward areas you
 * trained in the last two days. Routines already done today are skipped unless all of them are.
 */
export function suggestRoutine(state: ProgressState, now = new Date()): RoutineSuggestion {
  const today = localDay(now);
  const last = lastDoneByRoutine(state);
  if (!last.size) {
    return { routine: routineById['wake-up'], reason: 'A gentle head-to-toe start, made for first thing in the morning.' };
  }
  const doneToday = new Set(routinesDoneOn(state, today));
  const pool = routines.filter((r) => !doneToday.has(r.id));
  const options = pool.length ? pool : routines;

  let best: { routine: Routine; score: number; trained: TreeId[]; days: number | null } | null = null;
  for (const routine of options) {
    const day = last.get(routine.id);
    const days = day ? daysBetween(day, today) : null;
    const trained = HELPS_AFTER[routine.id].filter((t) => daysSinceTrained(t, state, now) <= 2);
    const score = (days === null ? 8 : Math.min(days, 7)) + (trained.length ? 3 : 0);
    if (!best || score > best.score) best = { routine, score, trained, days };
  }
  const { routine, trained, days } = best!;
  const reason = trained.length
    ? `Good after training ${trained.map((t) => treeById[t].name).join(' and ')} recently.`
    : days === null
      ? "You haven't tried this one yet."
      : days === 0
        ? 'You did this one today, but another round never hurts.'
        : `Last done ${days === 1 ? 'yesterday' : `${days} days ago`}.`;
  return { routine, reason };
}
