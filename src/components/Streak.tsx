import { useEffect, useMemo, useState } from 'react';
import { Flame, Timer } from 'lucide-react';
import { formatCountdown, formatDay } from '../lib/format';
import {
  addDays,
  daysBetween,
  MAX_REST_DAYS,
  streakDeadline,
  streakOf,
  streakUrgency,
  trainedDays,
  type Streak,
  type StreakUrgency,
} from '../lib/history';
import { localDay } from '../state/progress';
import { useProgress } from '../state/ProgressContext';

export function useStreak(): { streak: Streak; trained: Set<string>; today: string; urgency: StreakUrgency } {
  const { state } = useProgress();
  const today = localDay();
  return useMemo(() => {
    const days = trainedDays(state);
    const streak = streakOf(days, today);
    return { streak, trained: new Set(days), today, urgency: streakUrgency(streak, today) };
  }, [state, today]);
}

/** The current time, refreshed every `ms` so countdowns tick. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** What to do next to keep (or start) the streak. */
export function streakNote(streak: Streak, today: string): string {
  if (!streak.days) {
    return streak.best
      ? `Your best was ${streak.best} days. Train today to start a new streak.`
      : `Train today to start a streak. Rest days are fine, up to ${MAX_REST_DAYS} in a row.`;
  }
  if (streak.trainedToday) return `Trained today. ${streak.workouts} training days in this streak.`;
  const left = daysBetween(today, streak.keepBy!);
  if (left === 0) return `Workout needed today to keep your ${streak.days}-day streak.`;
  if (left === 1) return 'Train by tomorrow to keep it going.';
  return `Train by ${formatDay(streak.keepBy!, { weekday: 'long' })} to keep it going.`;
}

/** Live countdown to the moment the streak ends without a workout, coloured by how close that is. */
export function StreakTimer({ streak, urgency, now }: { streak: Streak; urgency: StreakUrgency; now: number }) {
  const deadline = streakDeadline(streak);
  if (!deadline || urgency === 'none') return null;
  const ends = formatDay(streak.keepBy!, { weekday: 'long', month: 'short', day: 'numeric' });
  return (
    <span className={`streak-timer is-${urgency}`} title={`Your streak ends at midnight at the end of ${ends} unless you train.`}>
      <Timer size={13} aria-hidden />
      <span role="timer">Ends in {formatCountdown(deadline.getTime() - now)}</span>
    </span>
  );
}

/** Home widget: the current streak, a countdown to when it ends, and the last seven days. */
export function StreakWidget() {
  const { streak, trained, today, urgency } = useStreak();
  const now = useNow(urgency === 'urgent' ? 1000 : 30_000);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const urgent = urgency === 'urgent';

  return (
    <a
      href={urgent ? '#/workout' : '#/history'}
      className={`streak-widget${streak.days ? ' is-on' : ''}${urgent ? ' is-urgent' : ''}`}
    >
      <span className="streak-widget__icon" aria-hidden>
        <Flame size={22} />
      </span>
      <span className="streak-widget__main">
        <span className="streak-widget__top">
          <strong className="streak-widget__value">
            {streak.days ? `${streak.days}-day streak` : 'No streak yet'}
          </strong>
          <StreakTimer streak={streak} urgency={urgency} now={now} />
        </span>
        <span className="streak-widget__note">
          {streakNote(streak, today)}
          {urgent && <strong> Tap to start a workout.</strong>}
        </span>
      </span>
      <span className="week-strip" role="img" aria-label={`Last 7 days: trained on ${week.filter((d) => trained.has(d)).length}`}>
        {week.map((d) => (
          <span
            key={d}
            className={`week-strip__day${trained.has(d) ? ' is-trained' : ''}${d === today ? ' is-today' : ''}`}
            title={`${formatDay(d)}: ${trained.has(d) ? 'trained' : 'rest'}`}
          >
            <span className="week-strip__label">{formatDay(d, { weekday: 'narrow' })}</span>
            <span className="week-strip__dot" />
          </span>
        ))}
      </span>
    </a>
  );
}
