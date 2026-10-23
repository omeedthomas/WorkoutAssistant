import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data';
import { fromDocs, toDocs } from '../cloud/documents';
import { mergeProgress } from '../cloud/merge';
import { initialProgress, progressReducer, sanitizeProgress, type LogEntry, type ProgressState } from '../state/progress';
import { sessionsCalories } from './calories';
import { formatWork } from './format';
import { meetsTarget } from './graph';
import { dayTotals } from './history';
import { planSession } from './progression';
import { averageSet, setValues, totalWork, workFromSets } from './sets';

const now = new Date('2026-10-18T12:00:00.000Z');
const pushup = exerciseById['pushup']; // 3 × 12 reps
const plank = exerciseById['plank']; // 3 × 45s
const dip = exerciseById['weighted-dip']; // 3 × 6 at +20 kg

/** A session `daysAgo` days back, of these sets, against a 3 × 10 plan. */
const session = (id: string, daysAgo: number, sets: number[]): LogEntry => ({
  id,
  date: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  ...workFromSets(sets),
  planned: { sets: 3, value: 10 },
});

describe('sets that differ', () => {
  it('keeps each set, with value as what every set reached', () => {
    const w = workFromSets([10, 9, 8]);
    expect(w).toEqual({ sets: 3, value: 8, perSet: [10, 9, 8] });
    expect(setValues(w)).toEqual([10, 9, 8]);
    expect(totalWork(w)).toBe(27);
    expect(averageSet(w)).toBe(9);
  });

  it('stays a plain sets × value when every set was the same', () => {
    expect(workFromSets([10, 10, 10], 5)).toEqual({ sets: 3, value: 10, addedKg: 5 });
    expect(setValues({ sets: 3, value: 10 })).toEqual([10, 10, 10]);
  });

  it('reads as each set', () => {
    expect(formatWork(pushup, workFromSets([10, 9, 8]), 'lb')).toBe('10, 9, 8 reps');
    expect(formatWork(pushup, workFromSets([10, 10]), 'lb')).toBe('2 × 10 reps');
    expect(formatWork(plank, workFromSets([45, 40, 30]), 'lb')).toBe('45s, 40s, 30s');
    expect(formatWork(dip, workFromSets([6, 5, 5], 20), 'kg')).toBe('6, 5, 5 reps at +20 kg');
  });

  it('only meets a target or plan when every set does', () => {
    expect(meetsTarget(pushup, workFromSets([12, 12, 11]))).toBe(false);
    expect(meetsTarget(pushup, workFromSets([13, 12, 12]))).toBe(true);
    // 12, 12, 11 against a 3 × 12 plan: go again rather than level up.
    const logs = [
      { ...session('b', 1, [12, 12, 11]), planned: { sets: 3, value: 12 } },
      { ...session('a', 3, [11, 11, 11]), planned: { sets: 3, value: 11 } },
    ];
    expect(planSession(pushup, logs, { now })).toMatchObject({ kind: 'repeat', sets: 3, value: 12 });
  });

  it('judges a miss by the typical set, not the worst one', () => {
    const before = session('a', 3, [10, 10, 10]);
    // 10, 8, 6 is 8 a set: a near miss, so the plan stays at 3 × 10.
    expect(planSession(pushup, [session('b', 1, [10, 8, 6]), before], { now })).toMatchObject({ kind: 'repeat', value: 10 });
    // 10, 6, 4 is well short: restart from about 6 a set, not from the last set's 4.
    expect(planSession(pushup, [session('b', 1, [10, 6, 4]), before], { now })).toMatchObject({ kind: 'reset', sets: 3, value: 7 });
  });

  it('adds every set up for the day and its calories', () => {
    const log = session('b', 0, [10, 9, 8]);
    expect(dayTotals({ day: '2026-10-18', sessions: [{ exercise: pushup, log }], workouts: [], trained: true })).toMatchObject({
      sets: 3,
      reps: 27,
    });
    const even = { ...log, sets: 3, value: 9, perSet: undefined };
    expect(sessionsCalories([{ exercise: pushup, log }], 80)).toBe(sessionsCalories([{ exercise: pushup, log: even }], 80));
  });
});

describe('correcting a logged session', () => {
  const logged: ProgressState = { ...initialProgress, logs: { pushup: [session('b', 0, [10, 10, 10]), session('a', 2, [9, 9, 9])] } };

  it('changes its numbers in place and remembers when', () => {
    const next = progressReducer(logged, {
      type: 'editLog',
      exerciseId: 'pushup',
      logId: 'b',
      work: workFromSets([10, 9, 8]),
      at: '2026-10-18T12:05:00.000Z',
    });
    expect(next.logs.pushup[0]).toMatchObject({ id: 'b', sets: 3, value: 8, perSet: [10, 9, 8], edited: '2026-10-18T12:05:00.000Z' });
    expect(next.logs.pushup[0].planned).toEqual({ sets: 3, value: 10 });
    expect(next.logs.pushup[1]).toBe(logged.logs.pushup[1]);

    const evenAgain = progressReducer(next, { type: 'editLog', exerciseId: 'pushup', logId: 'b', work: workFromSets([9, 9]), at: 't' });
    expect(evenAgain.logs.pushup[0]).not.toHaveProperty('perSet');
    expect(evenAgain.logs.pushup[0]).toMatchObject({ sets: 2, value: 9 });
  });

  it('ignores a session that no longer exists', () => {
    expect(progressReducer(logged, { type: 'editLog', exerciseId: 'pushup', logId: 'zz', work: workFromSets([1]), at: 't' })).toBe(logged);
  });

  it('wins over the older copy when both devices have the session', () => {
    const fixed = { ...logged.logs.pushup[0], ...workFromSets([10, 9, 8]), edited: '2026-10-18T12:05:00.000Z' };
    const local: ProgressState = { ...logged, logs: { pushup: [fixed, logged.logs.pushup[1]] } };
    expect(mergeProgress(local, logged).logs.pushup[0]).toEqual(fixed);
    expect(mergeProgress(logged, local).logs.pushup[0]).toEqual(fixed);
  });
});

describe('saving each set', () => {
  const state: ProgressState = {
    ...initialProgress,
    logs: { pushup: [{ ...session('b', 0, [10, 9, 8]), day: '2026-10-18', edited: '2026-10-18T12:05:00.000Z' }] },
  };

  it('survives the cloud and a reload', () => {
    expect(sanitizeProgress(fromDocs(toDocs(state)))!.logs).toEqual(state.logs);
    expect(sanitizeProgress(JSON.parse(JSON.stringify(state)))!.logs).toEqual(state.logs);
  });

  it('drops sets that do not add up, keeping the session', () => {
    const raw = { ...state, logs: { pushup: [{ ...state.logs.pushup[0], perSet: [10, 9] }] } };
    const clean = sanitizeProgress(raw)!.logs.pushup[0];
    expect(clean).not.toHaveProperty('perSet');
    expect(clean).toMatchObject({ sets: 3, value: 8 });
    // value always follows the sets
    const off = { ...state, logs: { pushup: [{ ...state.logs.pushup[0], value: 10 }] } };
    expect(sanitizeProgress(off)!.logs.pushup[0].value).toBe(8);
  });
});
