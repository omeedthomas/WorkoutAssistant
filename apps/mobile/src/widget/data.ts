import { formatDay } from '@ascent/core/lib/format';
import { todayAtAGlance } from '@ascent/core/lib/today';
import { focusTitle } from '@ascent/core/lib/workout';
import { workoutProgress, type ActiveWorkout } from '@ascent/core/state/activeWorkout';
import type { ProgressState } from '@ascent/core/state/progress';

/** What the home screen widget shows: your streak and today's workout, worked out like the Today tab does. */
export interface TodayWidgetData {
  streakDays: number;
  /** When to train next to keep the streak going, or to start one. */
  streakNote: string;
  /** The streak ends tonight without a workout. */
  urgent: boolean;
  eyebrow: string;
  title: string;
  detail: string;
  /** Where a tap goes: Today, or the workout in progress. */
  url: string;
}

export function todayWidgetData(state: ProgressState, active: ActiveWorkout | null, now = new Date()): TodayWidgetData {
  const today = todayAtAGlance(state, now);
  const { streak, urgency } = today;
  const streakNote = !streak.days
    ? 'Train today to start a streak'
    : streak.trainedToday
      ? 'Trained today'
      : urgency === 'urgent'
        ? 'Train today to keep your streak'
        : urgency === 'soon'
          ? 'Train by tomorrow to keep your streak'
          : `Train by ${formatDay(streak.keepBy!, { weekday: 'long' })} to keep your streak`;
  const base = { streakDays: streak.days, streakNote, urgent: urgency === 'urgent', url: 'ascent://' };

  if (active) {
    const { done, total } = workoutProgress(active);
    return { ...base, eyebrow: 'In progress', title: focusTitle(active.focus), detail: `${done} of ${total} done`, url: 'ascent://workout' };
  }
  if (today.done) return { ...base, eyebrow: 'Done today', title: 'Great job!', detail: 'Rest up, or keep going in Ascent.' };
  return {
    ...base,
    eyebrow: today.planned ? 'Your workout' : 'Suggested',
    title: today.title,
    detail: `${today.exercises} exercises · ~${today.minutes} min`,
  };
}
