import type { ProgressState } from '../state/progress';
import { formatCountdown } from './format';
import { addDays, REMINDER_HOURS, reminderTimes, streakDeadline } from './history';
import { todayAtAGlance } from './today';
import { focusTitle } from './workout';

/** Which reminders a device sends. They're per device (each one asks for its own permission), so not synced. */
export interface ReminderSettings {
  /** On a streak's last day, at REMINDER_HOURS, while you still haven't trained. */
  streak: boolean;
  /** A local hour (0–23) for a daily reminder to train, or null for none. */
  dailyHour: number | null;
}

export interface Reminder {
  /** One per time slot ("streak@18:2026-10-22", "daily:2026-10-21"), so scheduling again replaces it. */
  id: string;
  at: Date;
  title: string;
  body: string;
}

/** How many days ahead daily reminders are scheduled. Opening the app schedules them again. */
export const DAILY_REMINDER_DAYS = 7;

/**
 * The reminders to schedule from `now` on, soonest first, for a phone that hands them to the system ahead of
 * time because it can't run code at the reminder time. Work them out again whenever progress changes: training
 * moves the streak's last day, and finishing today's workout drops today's daily reminder.
 */
export function upcomingReminders(state: ProgressState, settings: ReminderSettings, now = new Date()): Reminder[] {
  const today = todayAtAGlance(state, now);
  const { streak } = today;
  const out: Reminder[] = [];

  if (settings.streak && streak.keepBy) {
    const deadline = streakDeadline(streak)!;
    reminderTimes(streak.keepBy).forEach((at, i) => {
      if (at <= now) return;
      out.push({
        id: `streak@${REMINDER_HOURS[i]}:${streak.keepBy}`,
        at,
        title: `Workout needed to keep your ${streak.days}-day streak`,
        body: `Your streak ends at midnight, ${formatCountdown(deadline.getTime() - at.getTime())} from now. Any workout counts.`,
      });
    });
  }

  if (settings.dailyHour !== null) {
    for (let d = 0; d < DAILY_REMINDER_DAYS; d++) {
      const day = addDays(today.day, d);
      const [at] = reminderTimes(day, [settings.dailyHour]);
      if (at <= now || (d === 0 && today.done)) continue;
      // Only today's workout is known; later days depend on what you train before then.
      const body =
        d === 0
          ? `Today: ${today.title}, ${today.exercises} exercises, about ${today.minutes} min.`
          : state.workoutPlan
            ? `Today: ${focusTitle(state.workoutPlan.focus)}. Open Ascent to start.`
            : 'Your workout for today is ready in Ascent.';
      out.push({ id: `daily:${day}`, at, title: 'Time to train', body });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
