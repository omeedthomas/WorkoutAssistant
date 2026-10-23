import { useEffect, type DependencyList } from 'react';
import { AppState } from 'react-native';
import { upcomingReminders } from '@ascent/core/lib/reminders';
import { useActiveWorkout } from '../state/ActiveWorkoutContext';
import { usePrefs } from '../state/PrefsContext';
import { useProgress } from '../state/ProgressContext';
import { refreshWidgets } from '../widget';
import { scheduleReminders } from './notifications';

/** Runs `update` a second after the last change, and whenever the app opens or closes (the day may have changed). */
function useUpdateSoon(update: () => void, deps: DependencyList) {
  useEffect(() => {
    const timer = setTimeout(update, 1000);
    const sub = AppState.addEventListener('change', (s) => s !== 'inactive' && update());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Keeps what the phone shows outside the app in step with your progress: the scheduled reminders and the home
 * screen widget, after every change (logging, a sync from another device). Only the widget follows the workout in
 * progress, which changes at every step.
 */
export function useOutsideTheApp() {
  const { state } = useProgress();
  const { active } = useActiveWorkout();
  const { prefs } = usePrefs();
  const { streakReminders: streak, dailyReminderHour: dailyHour } = prefs;

  useUpdateSoon(() => void scheduleReminders(upcomingReminders(state, { streak, dailyHour })), [state, streak, dailyHour]);
  useUpdateSoon(() => refreshWidgets(state, active), [state, active]);
}
