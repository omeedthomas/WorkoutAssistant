import { useEffect } from 'react';
import { formatCountdown } from '@ascent/core/lib/format';
import { REMINDER_HOURS, reminderTimes, streakDeadline, type Streak } from '@ascent/core/lib/history';
import { navigate } from '../lib/router';
import { useStreak } from './Streak';
import { useToast } from './Toast';

const PREF_KEY = 'ascent:streak-reminders';
const SENT_KEY = 'ascent:streak-reminded';

// ---------- Device preference (notification permission is per browser, so this isn't synced) ----------

export const remindersSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function remindersEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setRemindersEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(PREF_KEY, 'on');
    else localStorage.removeItem(PREF_KEY);
  } catch {
    // storage unavailable: reminders stay off
  }
}

/** Which reminders already went out today, so a reload doesn't repeat them. */
function sent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function markSent(keys: string[], today: string) {
  try {
    // Only today's keys are worth keeping.
    const kept = sent().filter((k) => k.endsWith(today));
    localStorage.setItem(SENT_KEY, JSON.stringify([...new Set([...kept, ...keys])]));
  } catch {
    // storage unavailable: a reminder may repeat after a reload
  }
}

/** A system notification; clicking it opens the Workout page. */
export function showNotification(title: string, body: string) {
  try {
    const n = new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icon.svg`, tag: 'ascent-streak' });
    n.onclick = () => {
      window.focus();
      navigate('#/workout');
      n.close();
    };
  } catch {
    // Some mobile browsers only allow notifications from a service worker; the in-app reminder still shows.
  }
}

function message(streak: Streak) {
  const left = formatCountdown(streakDeadline(streak)!.getTime() - Date.now());
  return {
    title: `Workout needed to keep your ${streak.days}-day streak`,
    body: `Your streak ends at midnight, ${left} from now. Any workout counts.`,
  };
}

/**
 * Tells you when a workout is needed today to keep your streak: an in-app
 * reminder when you open Ascent on the streak's last day, and, if turned on in
 * Settings, system notifications at REMINDER_HOURS. Without a push server,
 * browsers can only show those while Ascent is open in a tab (it can be in the background).
 */
export function StreakReminder() {
  const { streak, today, urgency } = useStreak();
  const toast = useToast();
  const urgent = urgency === 'urgent';

  // In-app, once a day: opening the app on the last day.
  useEffect(() => {
    if (!urgent) return;
    const key = `open:${today}`;
    if (sent().includes(key)) return;
    markSent([key], today);
    const { title, body } = message(streak);
    toast(title, body, 10_000);
  }, [urgent, today, streak, toast]);

  // System notifications at the reminder times, while the streak is still at risk.
  useEffect(() => {
    if (!urgent || !remindersEnabled() || !remindersSupported() || Notification.permission !== 'granted') return;
    const slots = reminderTimes(streak.keepBy!).map((at, i) => ({ at, key: `notify@${REMINDER_HOURS[i]}:${today}` }));
    const remind = (opening: boolean) => {
      const due = slots.filter((s) => s.at.getTime() <= Date.now() && !sent().includes(s.key));
      if (!due.length) return;
      markSent(due.map((s) => s.key), today); // one reminder covers any that were missed
      const { title, body } = message(streak);
      if (document.visibilityState === 'hidden') showNotification(title, body);
      else if (!opening) toast(title, body, 10_000); // on open, the in-app reminder above already says it
    };
    remind(true);
    const timers = slots.map((s) => window.setTimeout(() => remind(false), Math.max(0, s.at.getTime() - Date.now())));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [urgent, today, streak, toast]);

  return null;
}
