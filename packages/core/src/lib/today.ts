import type { TreeId } from '../data';
import { localDay, type ProgressState } from '../state/progress';
import { daySummaries, streakOf, streakUrgency, trainedDays, workoutDone, type Streak, type StreakUrgency } from './history';
import { focusTitle, generateWorkout, suggestSplit, type WorkoutLength } from './workout';

/** Today at a glance, as the Today screen works it out: the streak and the day's workout. */
export interface TodayAtAGlance {
  day: string;
  streak: Streak;
  urgency: StreakUrgency;
  /** From your workout plan, or today's suggested split without one. */
  focus: TreeId[];
  length: WorkoutLength;
  /** True when it comes from your workout plan rather than the suggestion. */
  planned: boolean;
  title: string;
  exercises: number;
  minutes: number;
  /** The day's workout is done (see `workoutDone`). */
  done: boolean;
}

/** For what's shown outside the app: the home screen widget and reminders. */
export function todayAtAGlance(state: ProgressState, now = new Date()): TodayAtAGlance {
  const day = localDay(now);
  const plan = state.workoutPlan;
  const length = plan?.length ?? 'standard';
  const workout = generateWorkout(state, plan?.focus ?? suggestSplit(state, now).split.focus, length, now);
  const streak = streakOf(trainedDays(state), day);
  return {
    day,
    streak,
    urgency: streakUrgency(streak, day),
    focus: workout.focus,
    length,
    planned: !!plan,
    title: focusTitle(workout.focus),
    exercises: workout.main.length,
    minutes: workout.minutes,
    done: workoutDone(daySummaries(state).get(day)),
  };
}
