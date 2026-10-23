import { exerciseById, type Exercise } from '../data';
import { localDay, type LogEntry, type ProgressState, type WeighIn, type WorkoutRecord } from '../state/progress';
import { averageSet, totalWork } from './sets';

// ---------- Days ----------

const DAY_MS = 86_400_000;

/** Days since the epoch for a local day ("2026-10-18"), for date arithmetic without time zones. */
function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(day: string, n: number): string {
  return new Date((dayNumber(day) + n) * DAY_MS).toISOString().slice(0, 10);
}

export const dayOf = (l: LogEntry) => l.day ?? localDay(l.date);

export interface DaySession {
  exercise: Exercise;
  log: LogEntry;
}

export interface DaySummary {
  day: string;
  /** Logged sets, in the order they were logged. */
  sessions: DaySession[];
  workouts: WorkoutRecord[];
  weight?: WeighIn;
  /** Counts toward the streak: something was logged, or a workout was finished. */
  trained: boolean;
}

/** Everything recorded on each day. */
export function daySummaries(state: ProgressState): Map<string, DaySummary> {
  const days = new Map<string, DaySummary>();
  const get = (day: string) => {
    let s = days.get(day);
    if (!s) days.set(day, (s = { day, sessions: [], workouts: [], trained: false }));
    return s;
  };
  for (const [id, list] of Object.entries(state.logs)) {
    const exercise = exerciseById[id];
    if (!exercise) continue;
    for (const log of list) get(dayOf(log)).sessions.push({ exercise, log });
  }
  for (const [day, list] of Object.entries(state.workouts)) get(day).workouts.push(...list);
  for (const [day, w] of Object.entries(state.weight)) get(day).weight = w;
  for (const s of days.values()) {
    s.sessions.sort((a, b) => a.log.date.localeCompare(b.log.date));
    s.trained = s.sessions.length > 0 || s.workouts.some((w) => w.finishedAt);
  }
  return days;
}

/**
 * Whether the day's workout is done: something was logged, or a workout was finished. Unlike `trained`, a
 * morning mobility routine doesn't count, since it isn't the day's workout.
 */
export function workoutDone(summary: DaySummary | undefined): boolean {
  return !!summary && (summary.sessions.length > 0 || summary.workouts.some((w) => w.finishedAt && !w.routine));
}

export function trainedDays(state: ProgressState): string[] {
  return [...daySummaries(state).values()].filter((s) => s.trained).map((s) => s.day);
}

/**
 * Groups a day's sessions under the workout they were logged during (between
 * its start and finish). Sessions logged outside any workout come back in `other`.
 */
export function sessionsByWorkout(summary: DaySummary): {
  workouts: { workout: WorkoutRecord; sessions: DaySession[] }[];
  other: DaySession[];
} {
  const inWindow = (w: WorkoutRecord, s: DaySession) => {
    const end = w.finishedAt ?? new Date(Date.parse(w.startedAt) + 4 * 3_600_000).toISOString();
    return s.log.date >= w.startedAt && s.log.date <= end;
  };
  const claimed = new Set<DaySession>();
  const workouts = [...summary.workouts]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((workout) => {
      const sessions = summary.sessions.filter((s) => !claimed.has(s) && inWindow(workout, s));
      sessions.forEach((s) => claimed.add(s));
      return { workout, sessions };
    });
  return { workouts, other: summary.sessions.filter((s) => !claimed.has(s)) };
}

export interface DayTotals {
  /** Titles of the workouts finished that day. */
  finished: string[];
  /** Time spent in finished workouts, or null if none were finished. */
  minutes: number | null;
  exercises: number;
  sets: number;
  /** Total reps across rep-based sessions (every set added up). */
  reps: number;
}

/** What a day added up to, for the "Great Job!" summary. */
export function dayTotals(summary: DaySummary): DayTotals {
  const finished = summary.workouts.filter((w) => w.finishedAt);
  const minutes = finished.length
    ? finished.reduce((sum, w) => {
        const m = Math.round((Date.parse(w.finishedAt!) - Date.parse(w.startedAt)) / 60_000);
        return sum + (m > 0 && m < 300 ? m : 0); // ignore a workout left open for hours
      }, 0)
    : null;
  return {
    finished: [...new Set(finished.map((w) => w.title))],
    minutes,
    exercises: new Set(summary.sessions.map((s) => s.exercise.id)).size,
    sets: summary.sessions.reduce((sum, s) => sum + s.log.sets, 0),
    reps: summary.sessions.reduce((sum, s) => sum + (s.exercise.target.unit === 'reps' ? totalWork(s.log) : 0), 0),
  };
}

// ---------- Streak ----------

/** Rest days allowed in a row before a streak ends. */
export const MAX_REST_DAYS = 2;

export interface Streak {
  /** Calendar days from the first to the latest training day of the current streak (0 if none). */
  days: number;
  /** Training days in the current streak. */
  workouts: number;
  /** Longest streak ever, in calendar days. */
  best: number;
  /** The last day you can train to keep the streak going (null without a streak). */
  keepBy: string | null;
  trainedToday: boolean;
}

/**
 * A streak is a run of training days with no more than MAX_REST_DAYS rest days
 * in a row between them, so normal rest days don't break it.
 */
export function streakOf(days: Iterable<string>, today: string): Streak {
  const sorted = [...new Set(days)].filter((d) => d <= today).sort();
  const runs: { start: string; end: string; count: number }[] = [];
  for (const d of sorted) {
    const run = runs[runs.length - 1];
    if (run && daysBetween(run.end, d) <= MAX_REST_DAYS + 1) {
      run.end = d;
      run.count++;
    } else runs.push({ start: d, end: d, count: 1 });
  }
  const span = (r: { start: string; end: string }) => daysBetween(r.start, r.end) + 1;
  const best = Math.max(0, ...runs.map(span));
  const last = runs[runs.length - 1];
  if (!last || daysBetween(last.end, today) > MAX_REST_DAYS + 1) {
    return { days: 0, workouts: 0, best, keepBy: null, trainedToday: false };
  }
  return {
    days: span(last),
    workouts: last.count,
    best,
    keepBy: addDays(last.end, MAX_REST_DAYS + 1),
    trainedToday: last.end === today,
  };
}

/** Local midnight at the start of a day ("2026-10-18"). */
function startOfDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** When the streak ends if you don't train: midnight at the end of its keep-by day, local time. */
export function streakDeadline(streak: Streak): Date | null {
  return streak.keepBy ? startOfDay(addDays(streak.keepBy, 1)) : null;
}

/**
 * How close the streak is to ending: `urgent` on the last day you can train
 * (and haven't yet), `soon` the day before, otherwise `safe`. `none` without a streak.
 */
export type StreakUrgency = 'none' | 'safe' | 'soon' | 'urgent';

export function streakUrgency(streak: Streak, today: string): StreakUrgency {
  if (!streak.days || !streak.keepBy) return 'none';
  if (streak.trainedToday) return 'safe';
  const left = daysBetween(today, streak.keepBy);
  return left <= 0 ? 'urgent' : left === 1 ? 'soon' : 'safe';
}

/** Local hours on the last day when reminders go out if you still haven't trained. */
export const REMINDER_HOURS = [18, 22];

/** The reminder times on a streak's last day. */
export function reminderTimes(keepBy: string, hours = REMINDER_HOURS): Date[] {
  const day = startOfDay(keepBy);
  return hours.map((h) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h));
}

// ---------- Growth ----------

export interface Growth {
  exercise: Exercise;
  /** Oldest first: reps (or seconds) per set (the average set when they differed), or added weight in kg on weighted exercises. */
  points: { date: string; value: number }[];
  first: number;
  latest: number;
  weighted: boolean;
}

/**
 * Every exercise you've logged, most recently trained first, with how the numbers have moved
 * (a single session is a starting point to grow from).
 */
export function growthOf(state: ProgressState, { limit = 5, sessions = 12 } = {}): Growth[] {
  const list: Growth[] = [];
  for (const [id, logs] of Object.entries(state.logs)) {
    const exercise = exerciseById[id];
    if (!exercise || !logs.length) continue;
    const weighted = exercise.target.addedKg !== undefined;
    const points = logs
      .slice(0, sessions)
      .reverse()
      .map((l) => ({ date: l.date, value: weighted ? (l.addedKg ?? 0) : Math.round(averageSet(l)) }));
    list.push({ exercise, points, first: points[0].value, latest: points[points.length - 1].value, weighted });
  }
  const lastDate = (g: Growth) => g.points[g.points.length - 1].date;
  return list.sort((a, b) => lastDate(b).localeCompare(lastDate(a))).slice(0, limit);
}

// ---------- Body weight ----------

export function weightSeries(state: ProgressState): { day: string; kg: number }[] {
  return Object.entries(state.weight)
    .map(([day, w]) => ({ day, kg: w.kg }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Days in the trend average: long enough to smooth out day-to-day water-weight swings. */
export const TREND_DAYS = 7;

export interface WeightPoint {
  day: string;
  kg: number;
  /** Average of the weigh-ins in the TREND_DAYS days ending on this one. */
  avg: number;
  /** Change since the previous weigh-in, in kg (null for the first one). */
  change: number | null;
}

/** Every weigh-in with its trend average and the change since the one before. */
export function weightTrend(series: { day: string; kg: number }[]): WeightPoint[] {
  return series.map((w, i) => {
    const recent = series.slice(0, i + 1).filter((x) => daysBetween(x.day, w.day) < TREND_DAYS);
    return {
      day: w.day,
      kg: w.kg,
      avg: recent.reduce((sum, x) => sum + x.kg, 0) / recent.length,
      change: i ? w.kg - series[i - 1].kg : null,
    };
  });
}

export interface WeightStats {
  /** Last weigh-in minus the first one in the period. */
  change: number;
  low: WeightPoint;
  high: WeightPoint;
  /** The typical change from one weigh-in to the next (mean of the absolute changes). */
  typicalSwing: number | null;
  /** The weigh-in with the largest change from the one before. */
  biggest: WeightPoint | null;
}

/** How much the weigh-ins in a period moved around. */
export function weightStats(points: WeightPoint[]): WeightStats | null {
  if (!points.length) return null;
  const changes = points.filter((p) => p.change !== null);
  return {
    change: points[points.length - 1].kg - points[0].kg,
    low: points.reduce((a, b) => (b.kg < a.kg ? b : a)),
    high: points.reduce((a, b) => (b.kg > a.kg ? b : a)),
    typicalSwing: changes.length ? changes.reduce((sum, p) => sum + Math.abs(p.change!), 0) / changes.length : null,
    biggest: changes.length ? changes.reduce((a, b) => (Math.abs(b.change!) > Math.abs(a.change!) ? b : a)) : null,
  };
}

/** Body weight on `day`: the latest weigh-in on or before it, else the earliest one. Null with no weigh-ins. */
export function bodyWeightOn(state: ProgressState, day: string = localDay()): number | null {
  const series = weightSeries(state);
  if (!series.length) return null;
  const before = series.filter((w) => w.day <= day);
  return (before[before.length - 1] ?? series[0]).kg;
}

export interface WeightProgress {
  start: number;
  current: number;
  goal: number;
  /** 0–1 of the way from the starting weight to the goal. */
  done: number;
  /** kg still to go (positive = gain, negative = lose). */
  remaining: number;
}

/** Progress toward the weight goal, measured from your weight when you set it. */
export function weightGoalProgress(state: ProgressState): WeightProgress | null {
  const goal = state.weightGoal;
  const series = weightSeries(state);
  if (!goal || !series.length) return null;
  const start = bodyWeightOn(state, localDay(goal.at))!;
  const current = series[series.length - 1].kg;
  const total = goal.kg - start;
  const done = total === 0 ? 1 : Math.min(1, Math.max(0, (current - start) / total));
  return { start, current, goal: goal.kg, done, remaining: goal.kg - current };
}
