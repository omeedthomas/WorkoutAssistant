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
    });
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

  it('formats local days', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
