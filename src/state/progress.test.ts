import { describe, expect, it } from 'vitest';
import { initialProgress, localDay, MAX_GOALS, progressReducer, sanitizeProgress, type ProgressState } from './progress';

const at = '2026-01-01T00:00:00.000Z';

describe('progressReducer', () => {
  it('masters exercises and keeps the original timestamp', () => {
    let s = progressReducer(initialProgress, { type: 'master', ids: ['pushup'], at });
    s = progressReducer(s, { type: 'master', ids: ['pushup'], at: '2027-01-01T00:00:00.000Z' });
    expect(s.mastered).toEqual({ pushup: at });
  });

  it('ignores unknown exercise ids', () => {
    const s = progressReducer(initialProgress, { type: 'master', ids: ['nope'], at });
    expect(s.mastered).toEqual({});
  });

  it('unmasters', () => {
    const s = progressReducer({ ...initialProgress, mastered: { pushup: at } }, { type: 'unmaster', id: 'pushup' });
    expect(s.mastered).toEqual({});
  });

  it('logs newest first and deletes logs', () => {
    let s = progressReducer(initialProgress, {
      type: 'log',
      exerciseId: 'pushup',
      entry: { id: 'a', date: at, sets: 3, value: 8 },
    });
    s = progressReducer(s, {
      type: 'log',
      exerciseId: 'pushup',
      entry: { id: 'b', date: at, sets: 3, value: 9 },
    });
    expect(s.logs.pushup.map((l) => l.id)).toEqual(['b', 'a']);
    s = progressReducer(s, { type: 'deleteLog', exerciseId: 'pushup', logId: 'b' });
    s = progressReducer(s, { type: 'deleteLog', exerciseId: 'pushup', logId: 'a' });
    expect(s.logs).toEqual({});
  });

  it('toggles goals up to the limit', () => {
    let s: ProgressState = initialProgress;
    const ids = ['pushup', 'pullup', 'dip', 'squat', 'l-sit', 'plank'];
    for (const id of ids) s = progressReducer(s, { type: 'toggleGoal', id });
    expect(s.goals).toEqual(ids.slice(0, MAX_GOALS));
    s = progressReducer(s, { type: 'toggleGoal', id: 'pushup' });
    expect(s.goals).not.toContain('pushup');
  });

  it('applies a starting point: unmasters, then masters, then marks onboarded', () => {
    const start: ProgressState = { ...initialProgress, mastered: { 'diamond-pushup': at, pushup: at } };
    const s = progressReducer(start, {
      type: 'applyStartingPoint',
      unmaster: ['diamond-pushup', 'pushup'],
      master: ['pushup'],
      at: '2027-01-01T00:00:00.000Z',
    });
    expect(Object.keys(s.mastered)).toEqual(['pushup']);
    expect(s.onboarded).toBe(true);
  });
});

describe('sanitizeProgress', () => {
  it('rejects garbage', () => {
    expect(sanitizeProgress(null)).toBeNull();
    expect(sanitizeProgress({ version: 2 })).toBeNull();
    expect(sanitizeProgress('hello')).toBeNull();
  });

  it('drops unknown exercises and invalid logs', () => {
    const s = sanitizeProgress({
      version: 1,
      mastered: { pushup: at, removed: at, dip: 5 },
      logs: {
        pushup: [
          { id: 'ok', date: at, sets: 3, value: 10 },
          { id: 'bad', date: at, sets: -1, value: 10 },
        ],
        removed: [{ id: 'x', date: at, sets: 1, value: 1 }],
      },
      goals: ['pullup', 'pullup', 'removed'],
      onboarded: true,
    });
    expect(s).toEqual({
      version: 1,
      mastered: { pushup: at },
      logs: { pushup: [{ id: 'ok', date: at, sets: 3, value: 10 }] },
      goals: ['pullup'],
      onboarded: true,
      workouts: {},
      weight: {},
      weightGoal: null,
      units: 'lb',
      workoutPlan: null,
    });
  });

  it('keeps a valid workout plan and drops broken ones', () => {
    const plan = (p: unknown) => sanitizeProgress({ version: 1, workoutPlan: p })!.workoutPlan;
    expect(plan({ focus: ['push', 'pull', 'push', 'bogus'], length: 'long', at })).toEqual({ focus: ['push', 'pull'], length: 'long', at });
    expect(plan({ focus: ['bogus'], length: 'long', at })).toBeNull();
    expect(plan({ focus: ['push'], length: 'forever', at })).toBeNull();
    expect(plan(undefined)).toBeNull();
  });

  it('keeps added weight, weigh-ins, the weight goal, units and workout calories, and drops nonsense', () => {
    const s = sanitizeProgress({
      version: 1,
      logs: {
        'weighted-pullup': [
          { id: 'a', date: at, sets: 3, value: 5, addedKg: 10, planned: { sets: 3, value: 5, addedKg: 10 } },
          { id: 'b', date: at, sets: 3, value: 5, addedKg: -4 },
        ],
      },
      workouts: { '2026-10-18': [{ title: 'Push', focus: ['push'], length: 'short', startedAt: at, finishedAt: at, kcal: 212.6 }] },
      weight: { '2026-10-18': { kg: 80.5, at }, '2026-10-19': { kg: 5, at }, nope: { kg: 80, at } },
      weightGoal: { kg: 75, at },
      units: 'kg',
    })!;
    expect(s.logs['weighted-pullup']).toEqual([
      { id: 'a', date: at, sets: 3, value: 5, addedKg: 10, planned: { sets: 3, value: 5, addedKg: 10 } },
      { id: 'b', date: at, sets: 3, value: 5 },
    ]);
    expect(s.workouts['2026-10-18'][0].kcal).toBe(213);
    expect(s.weight).toEqual({ '2026-10-18': { kg: 80.5, at } });
    expect(s.weightGoal).toEqual({ kg: 75, at });
    expect(s.units).toBe('kg');
    expect(sanitizeProgress({ version: 1, weightGoal: { kg: 'heavy', at } })!.weightGoal).toBeNull();
  });

  it('keeps valid workout records and session days, and drops broken ones', () => {
    const s = sanitizeProgress({
      version: 1,
      logs: { pushup: [{ id: 'a', date: at, day: '2026-10-18', sets: 3, value: 5 }, { id: 'b', date: at, day: 'nope', sets: 3, value: 5 }] },
      workouts: {
        '2026-10-18': [
          { title: 'Push + Pull', focus: ['push', 'pull', 'bogus'], length: 'standard', startedAt: at, finishedAt: at },
          { title: 'Broken', focus: ['push'], length: 'forever', startedAt: at },
        ],
        'not-a-day': [{ title: 'x', focus: [], length: 'short', startedAt: at }],
      },
    })!;
    expect(s.logs.pushup.map((l) => l.day)).toEqual(['2026-10-18', undefined]);
    expect(s.workouts).toEqual({
      '2026-10-18': [{ title: 'Push + Pull', focus: ['push', 'pull'], length: 'standard', startedAt: at, finishedAt: at }],
    });
  });
});

describe('workout records', () => {
  const record = { title: 'Push + Pull', focus: ['push', 'pull'] as ('push' | 'pull')[], length: 'standard' as const, startedAt: at };

  it('records, finishes and removes workouts by day', () => {
    let s = progressReducer(initialProgress, { type: 'recordWorkout', day: '2026-10-18', record });
    s = progressReducer(s, { type: 'recordWorkout', day: '2026-10-18', record }); // no duplicates
    expect(s.workouts['2026-10-18']).toHaveLength(1);
    s = progressReducer(s, { type: 'finishWorkout', day: '2026-10-18', startedAt: at, at: 'later' });
    expect(s.workouts['2026-10-18'][0].finishedAt).toBe('later');
    s = progressReducer(s, { type: 'removeWorkout', day: '2026-10-18', startedAt: at });
    expect(s.workouts).toEqual({});
  });

  it('saves the calorie estimate when a workout is finished', () => {
    let s = progressReducer(initialProgress, { type: 'recordWorkout', day: '2026-10-18', record });
    s = progressReducer(s, { type: 'finishWorkout', day: '2026-10-18', startedAt: at, at: 'later', kcal: 240 });
    expect(s.workouts['2026-10-18'][0]).toMatchObject({ finishedAt: 'later', kcal: 240 });
  });

  it('formats local days', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('body weight and units', () => {
  it('keeps one weigh-in per day, replacing it when logged again', () => {
    let s = progressReducer(initialProgress, { type: 'logWeight', day: '2026-10-18', entry: { kg: 80, at } });
    s = progressReducer(s, { type: 'logWeight', day: '2026-10-18', entry: { kg: 79.5, at: 'later' } });
    s = progressReducer(s, { type: 'logWeight', day: '2026-10-19', entry: { kg: 79, at } });
    expect(s.weight).toEqual({ '2026-10-18': { kg: 79.5, at: 'later' }, '2026-10-19': { kg: 79, at } });
    s = progressReducer(s, { type: 'deleteWeight', day: '2026-10-18' });
    expect(Object.keys(s.weight)).toEqual(['2026-10-19']);
  });

  it('sets and clears the weight goal', () => {
    let s = progressReducer(initialProgress, { type: 'setWeightGoal', goal: { kg: 75, at } });
    expect(s.weightGoal).toEqual({ kg: 75, at });
    s = progressReducer(s, { type: 'setWeightGoal', goal: null });
    expect(s.weightGoal).toBeNull();
  });

  it('saves, replaces and clears the workout plan', () => {
    let s = progressReducer(initialProgress, { type: 'setWorkoutPlan', plan: { focus: ['push', 'core'], length: 'short', at } });
    expect(s.workoutPlan).toEqual({ focus: ['push', 'core'], length: 'short', at });
    s = progressReducer(s, { type: 'setWorkoutPlan', plan: null });
    expect(s.workoutPlan).toBeNull();
  });

  it('keeps the units preference through a reset, but not the weigh-ins', () => {
    let s = progressReducer(initialProgress, { type: 'setUnits', units: 'kg' });
    s = progressReducer(s, { type: 'logWeight', day: '2026-10-18', entry: { kg: 80, at } });
    s = progressReducer(s, { type: 'reset' });
    expect(s.units).toBe('kg');
    expect(s.weight).toEqual({});
  });
});
