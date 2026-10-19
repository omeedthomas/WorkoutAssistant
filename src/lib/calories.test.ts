import { describe, expect, it } from 'vitest';
import { initialProgress } from '../state/progress';
import { activeCalories, dayCalories, recordCalories, workoutCalories } from './calories';
import { daySummaries } from './history';
import { generateWorkout } from './workout';

describe('calorie estimates', () => {
  it('scales with body weight', () => {
    const w = generateWorkout(initialProgress, ['push', 'pull'], 'standard');
    const light = workoutCalories(w, 60);
    const heavy = workoutCalories(w, 90);
    expect(light).toBeGreaterThan(100);
    expect(heavy / light).toBeCloseTo(1.5, 1);
  });

  it('counts only what has been done in a started workout', () => {
    const base = {
      day: 'x',
      startedAt: '2026-10-18T18:00:00.000Z',
      focus: ['push' as const],
      length: 'short' as const,
      warmup: ['pulse'],
      cooldown: [],
      notes: [],
      main: [{ exerciseId: 'pushup', sets: 3, value: 8, kind: 'start' as const, reason: '', why: '', block: 'strength' as const }],
    };
    expect(activeCalories({ ...base, checked: [] }, 80)).toBe(0);
    const done = activeCalories(
      { ...base, checked: ['pulse'], main: [{ ...base.main[0], logged: { sets: 3, value: 8, logId: 'a' } }] },
      80,
    );
    expect(done).toBeGreaterThan(0);
  });

  it('prefers the estimate saved with a finished workout', () => {
    const record = { title: 'Push', focus: ['push' as const], length: 'short' as const, startedAt: 'x', kcal: 321 };
    expect(recordCalories(record, [], 80)).toBe(321);
    expect(recordCalories({ ...record, kcal: undefined }, [], 80)).toBe(0);
  });

  it('adds up a day of sessions', () => {
    const s = {
      ...initialProgress,
      logs: { pushup: [{ id: 'a', date: '2026-10-18T18:00:00.000Z', day: '2026-10-18', sets: 3, value: 10 }] },
    };
    expect(dayCalories(daySummaries(s).get('2026-10-18')!, 80)).toBeGreaterThan(0);
  });
});
