import { describe, expect, it } from 'vitest';
import { initialProgress, type LogEntry, type ProgressState } from '../state/progress';
import {
  addDays,
  bodyWeightOn,
  daySummaries,
  dayTotals,
  growthOf,
  reminderTimes,
  sessionsByWorkout,
  streakDeadline,
  streakOf,
  streakUrgency,
  trainedDays,
  weightGoalProgress,
  weightStats,
  weightTrend,
} from './history';

const log = (id: string, day: string, value: number, extra: Partial<LogEntry> = {}): LogEntry => ({
  id,
  date: `${day}T18:00:00.000Z`,
  day,
  sets: 3,
  value,
  ...extra,
});
const state = (p: Partial<ProgressState>): ProgressState => ({ ...initialProgress, ...p });

describe('day arithmetic', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('daySummaries', () => {
  it('collects sessions, workouts and weigh-ins per day, and marks training days', () => {
    const s = state({
      logs: { pushup: [log('b', '2026-10-18', 8)], squat: [log('a', '2026-10-18', 20)] },
      workouts: {
        '2026-10-16': [{ title: 'Legs', focus: ['legs'], length: 'short', startedAt: '2026-10-16T18:00:00.000Z' }],
        '2026-10-17': [
          { title: 'Push', focus: ['push'], length: 'short', startedAt: '2026-10-17T18:00:00.000Z', finishedAt: '2026-10-17T18:40:00.000Z' },
        ],
      },
      weight: { '2026-10-15': { kg: 80, at: '2026-10-15T07:00:00.000Z' } },
    });
    const days = daySummaries(s);
    expect(days.get('2026-10-18')!.sessions.map((x) => x.exercise.id)).toEqual(['pushup', 'squat']);
    // Started but never finished, with nothing logged: not a training day. A weigh-in isn't either.
    expect(trainedDays(s).sort()).toEqual(['2026-10-17', '2026-10-18']);
    expect(days.get('2026-10-15')!.weight).toEqual({ kg: 80, at: '2026-10-15T07:00:00.000Z' });
  });

  it('files sessions under the workout they were logged during', () => {
    const s = state({
      logs: {
        pushup: [log('in', '2026-10-18', 8, { date: '2026-10-18T18:10:00.000Z' })],
        squat: [log('after', '2026-10-18', 20, { date: '2026-10-18T21:00:00.000Z' })],
      },
      workouts: {
        '2026-10-18': [
          { title: 'Push', focus: ['push'], length: 'short', startedAt: '2026-10-18T18:00:00.000Z', finishedAt: '2026-10-18T18:30:00.000Z' },
        ],
      },
    });
    const { workouts, other } = sessionsByWorkout(daySummaries(s).get('2026-10-18')!);
    expect(workouts[0].sessions.map((x) => x.log.id)).toEqual(['in']);
    expect(other.map((x) => x.log.id)).toEqual(['after']);
  });
});

describe('dayTotals', () => {
  it('adds up time, exercises, sets and reps for the "Great Job!" summary', () => {
    const s = state({
      logs: {
        pushup: [log('a', '2026-10-18', 10)], // 3 × 10 reps
        plank: [log('b', '2026-10-18', 30)], // holds don't count as reps
      },
      workouts: {
        '2026-10-18': [
          { title: 'Push + Core', focus: ['push', 'core'], length: 'standard', startedAt: '2026-10-18T17:50:00.000Z', finishedAt: '2026-10-18T18:32:00.000Z' },
        ],
      },
    });
    expect(dayTotals(daySummaries(s).get('2026-10-18')!)).toEqual({
      finished: ['Push + Core'],
      minutes: 42,
      exercises: 2,
      sets: 6,
      reps: 30,
    });
  });

  it('has no time when nothing was finished', () => {
    const s = state({ logs: { pushup: [log('a', '2026-10-18', 10)] } });
    expect(dayTotals(daySummaries(s).get('2026-10-18')!).minutes).toBeNull();
  });
});

describe('streakOf', () => {
  const today = '2026-10-18';

  it('is empty without training', () => {
    expect(streakOf([], today)).toEqual({ days: 0, workouts: 0, best: 0, keepBy: null, trainedToday: false });
  });

  it('allows up to two rest days in a row', () => {
    // Trained Oct 10, 13 (two rest days), 15 and 18.
    const s = streakOf(['2026-10-10', '2026-10-13', '2026-10-15', '2026-10-18'], today);
    expect(s).toMatchObject({ days: 9, workouts: 4, trainedToday: true, keepBy: '2026-10-21' });
  });

  it('ends after three rest days in a row, but remembers the best', () => {
    const s = streakOf(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-14'], today);
    expect(s.days).toBe(0);
    expect(s.best).toBe(4);
  });

  it('stays alive until the last day you can train', () => {
    expect(streakOf(['2026-10-14', '2026-10-15'], today)).toMatchObject({ days: 2, keepBy: '2026-10-18', trainedToday: false });
    expect(streakOf(['2026-10-14'], '2026-10-19').days).toBe(0);
  });

  it('ignores future days', () => {
    expect(streakOf(['2026-10-25'], today).days).toBe(0);
  });
});

describe('streak deadline and urgency', () => {
  const today = '2026-10-18';

  it('ends at local midnight after the last day you can train', () => {
    const streak = streakOf(['2026-10-14', '2026-10-15'], today); // keep by Oct 18
    expect(streakDeadline(streak)).toEqual(new Date(2026, 9, 19, 0, 0, 0));
    expect(streakDeadline(streakOf([], today))).toBeNull();
  });

  it('is urgent on the last day, soon the day before, and safe otherwise', () => {
    expect(streakUrgency(streakOf(['2026-10-15'], today), today)).toBe('urgent'); // keep by today
    expect(streakUrgency(streakOf(['2026-10-16'], today), today)).toBe('soon'); // keep by tomorrow
    expect(streakUrgency(streakOf(['2026-10-17'], today), today)).toBe('safe');
    expect(streakUrgency(streakOf(['2026-10-15', today], today), today)).toBe('safe'); // trained today
    expect(streakUrgency(streakOf([], today), today)).toBe('none');
  });

  it('schedules reminders on the last day', () => {
    expect(reminderTimes('2026-10-18', [18, 22])).toEqual([new Date(2026, 9, 18, 18), new Date(2026, 9, 18, 22)]);
  });
});

describe('growthOf', () => {
  it('shows how reps and added weight moved, most recently trained first', () => {
    const s = state({
      logs: {
        pushup: [log('p3', '2026-10-18', 10), log('p2', '2026-10-16', 8), log('p1', '2026-10-14', 6)],
        'weighted-pullup': [log('w2', '2026-10-17', 5, { addedKg: 10 }), log('w1', '2026-10-15', 5, { addedKg: 5 })],
        squat: [log('s1', '2026-10-01', 20)], // a single session still counts, as a starting point
      },
    });
    const g = growthOf(s);
    expect(g.map((x) => x.exercise.id)).toEqual(['pushup', 'weighted-pullup', 'squat']);
    expect(g[2]).toMatchObject({ first: 20, latest: 20 });
    expect(g[2].points).toHaveLength(1);
    expect(g[0]).toMatchObject({ first: 6, latest: 10, weighted: false });
    expect(g[0].points.map((p) => p.value)).toEqual([6, 8, 10]);
    expect(g[1]).toMatchObject({ first: 5, latest: 10, weighted: true });
  });
});

describe('body weight', () => {
  const s = state({
    weight: {
      '2026-10-01': { kg: 84, at: '2026-10-01T07:00:00.000Z' },
      '2026-10-10': { kg: 82, at: '2026-10-10T07:00:00.000Z' },
      '2026-10-18': { kg: 81, at: '2026-10-18T07:00:00.000Z' },
    },
    weightGoal: { kg: 78, at: '2026-10-02T12:00:00.000Z' },
  });

  it('uses the latest weigh-in on or before a day', () => {
    expect(bodyWeightOn(s, '2026-10-12')).toBe(82);
    expect(bodyWeightOn(s, '2026-09-01')).toBe(84); // before any: the earliest
    expect(bodyWeightOn(initialProgress, '2026-10-12')).toBeNull();
  });

  it('smooths weigh-ins into a 7-day average and tracks each change', () => {
    const points = weightTrend([
      { day: '2026-10-01', kg: 80 },
      { day: '2026-10-03', kg: 81 },
      { day: '2026-10-06', kg: 79 },
      { day: '2026-10-08', kg: 78.5 }, // Oct 1 is now outside the 7 days
    ]);
    expect(points.map((p) => p.change)).toEqual([null, 1, -2, -0.5]);
    expect(points.map((p) => +p.avg.toFixed(2))).toEqual([80, 80.5, 80, 79.5]);
  });

  it('summarises how much the weight moved', () => {
    const stats = weightStats(
      weightTrend([
        { day: '2026-10-01', kg: 80 },
        { day: '2026-10-02', kg: 81.5 },
        { day: '2026-10-03', kg: 80.5 },
        { day: '2026-10-04', kg: 79 },
      ]),
    )!;
    expect(stats.change).toBe(-1);
    expect([stats.low.kg, stats.high.kg]).toEqual([79, 81.5]);
    expect(stats.typicalSwing).toBeCloseTo((1.5 + 1 + 1.5) / 3);
    expect(stats.biggest!.day).toBe('2026-10-02'); // ties keep the first
    expect(weightStats([])).toBeNull();
  });

  it('describes a single weigh-in without inventing a change', () => {
    const stats = weightStats(weightTrend([{ day: '2026-10-18', kg: 80 }]))!;
    expect(stats).toMatchObject({ change: 0, typicalSwing: null, biggest: null });
    expect([stats.low.kg, stats.high.kg]).toEqual([80, 80]);
  });

  it('measures goal progress from your weight when the goal was set', () => {
    expect(weightGoalProgress(s)).toEqual({ start: 84, current: 81, goal: 78, done: 0.5, remaining: -3 });
    expect(weightGoalProgress({ ...s, weightGoal: null })).toBeNull();
  });
});
