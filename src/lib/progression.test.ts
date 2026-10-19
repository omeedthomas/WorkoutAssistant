import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data';
import type { LogEntry } from '../state/progress';
import { planSession, sessionsToMastery, startValue, stepFor } from './progression';
import { fromUnits, toUnits } from './units';

const now = new Date('2026-10-18T12:00:00.000Z');
const pushup = exerciseById['pushup']; // 3 × 12 reps
const plank = exerciseById['plank']; // 3 × 45s

/** Sessions newest first, one day apart. `p` is what was planned for that session. */
function history(...sessions: [sets: number, value: number, p?: [number, number]][]): LogEntry[] {
  return sessions.map(([sets, value, p], i) => ({
    id: String(i),
    date: new Date(now.getTime() - (i + 1) * 86_400_000).toISOString(),
    sets,
    value,
    ...(p && { planned: { sets: p[0], value: p[1] } }),
  }));
}

const plan = (logs: LogEntry[], ex = pushup, mastered = false) => planSession(ex, logs, { now, mastered });

describe('step sizes', () => {
  it('adds about 10% of the target per session, at least 1', () => {
    expect(stepFor(pushup)).toBe(1);
    expect(stepFor(exerciseById['wall-pushup'])).toBe(2); // target 20
    expect(stepFor(plank)).toBe(5); // 45s
  });

  it('starts at about half the target', () => {
    expect(startValue(pushup)).toBe(6);
    expect(startValue(plank)).toBe(25);
    expect(startValue(exerciseById['tuck-planche'])).toBe(5); // 10s hold
  });
});

describe('planSession', () => {
  it('gives beginners a starting prescription', () => {
    const p = plan([]);
    expect(p).toMatchObject({ kind: 'start', sets: 3, value: 6 });
    expect(p.sessionsToMastery).toBe(7);
  });

  it('treats the first session as calibration, even if it misses the start plan', () => {
    expect(plan(history([3, 3, [3, 6]]))).toMatchObject({ kind: 'progress', sets: 3, value: 4 });
  });

  it('levels up after a completed session', () => {
    const p = plan(history([3, 5, [3, 5]], [3, 4, [3, 4]]));
    expect(p).toMatchObject({ kind: 'progress', sets: 3, value: 6 });
    expect(p.reason).toMatch(/last time/);
  });

  it('pushes harder when you have been stuck at the same numbers for a while', () => {
    const p = plan(history([3, 5], [3, 5], [3, 5]));
    expect(p).toMatchObject({ kind: 'progress', sets: 3, value: 6 });
    expect(p.reason).toMatch(/3 sessions in a row/);
    expect(p.reason).toMatch(/push/);
  });

  it('repeats a missed plan', () => {
    expect(plan(history([3, 5, [3, 6]], [3, 5, [3, 5]]))).toMatchObject({ kind: 'repeat', sets: 3, value: 6 });
  });

  it('warns before switching tactics on the second miss', () => {
    const p = plan(history([3, 5, [3, 6]], [3, 5, [3, 6]], [3, 5, [3, 5]]));
    expect(p).toMatchObject({ kind: 'repeat', value: 6 });
    expect(p.tip).toMatch(/extra-volume/);
  });

  it('breaks a plateau with an extra set at the level below', () => {
    const p = plan(history([3, 5, [3, 6]], [3, 5, [3, 6]], [3, 5, [3, 6]], [3, 5, [3, 5]]));
    expect(p).toMatchObject({ kind: 'consolidate', sets: 4, value: 5 });
    expect(p.tip).toMatch(/negatives/);
  });

  it('goes back to the target sets after an extra-volume session', () => {
    expect(plan(history([4, 5, [4, 5]], [3, 5, [3, 6]]))).toMatchObject({ kind: 'progress', sets: 3, value: 6 });
  });

  it('resets when a session falls far short of the plan', () => {
    expect(plan(history([3, 3, [3, 8]], [3, 8, [3, 8]]))).toMatchObject({ kind: 'reset', sets: 3, value: 4 });
  });

  it('builds up to the target number of sets before adding reps', () => {
    expect(plan(history([2, 5]))).toMatchObject({ kind: 'add-set', sets: 3, value: 5 });
    expect(plan(history([2, 15]))).toMatchObject({ kind: 'add-set', sets: 3, value: 12 });
  });

  it('never prescribes more than the mastery target', () => {
    expect(plan(history([3, 11]))).toMatchObject({ sets: 3, value: 12, sessionsToMastery: 1 });
  });

  it('recognises the mastery target', () => {
    const p = plan(history([3, 12]));
    expect(p.kind).toBe('mastery');
    expect(p.reason).toMatch(/Diamond Push-up/);
  });

  it('switches to maintenance once mastered', () => {
    expect(plan(history([3, 12]), pushup, true)).toMatchObject({ kind: 'maintain', sets: 3, value: 12 });
  });

  it('eases you back in after a long break', () => {
    const logs = history([3, 8]);
    logs[0].date = new Date(now.getTime() - 20 * 86_400_000).toISOString();
    const p = plan(logs);
    expect(p).toMatchObject({ kind: 'return', sets: 3, value: 7 });
    expect(p.reason).toMatch(/20 days/);
  });

  it('progresses holds in seconds', () => {
    expect(plan(history([3, 30]), plank)).toMatchObject({ kind: 'progress', sets: 3, value: 35 });
  });

  it('uses the larger step for high-rep targets', () => {
    expect(plan(history([3, 10]), exerciseById['wall-pushup'])).toMatchObject({ value: 12 });
  });
});

describe('sessionsToMastery', () => {
  it('counts set and rep steps', () => {
    expect(sessionsToMastery(pushup, { sets: 2, value: 10 })).toBe(1 + 1 + 2);
    expect(sessionsToMastery(pushup, { sets: 3, value: 12 })).toBe(1);
  });
});

describe('weighted exercises', () => {
  const pull = exerciseById['weighted-pullup']; // 3 × 5 at +20 kg
  const kg = (lb: number) => fromUnits(lb, 'lb');
  /** Newest first; `p` is the planned [sets, reps, added lb]. */
  const lifts = (...sessions: [sets: number, reps: number, lb: number, p?: [number, number, number]][]): LogEntry[] =>
    sessions.map(([sets, value, lb, p], i) => ({
      id: String(i),
      date: new Date(now.getTime() - (i + 1) * 86_400_000).toISOString(),
      sets,
      value,
      addedKg: kg(lb),
      ...(p && { planned: { sets: p[0], value: p[1], addedKg: kg(p[2]) } }),
    }));
  const lbPlan = (logs: LogEntry[], mastered = false) => {
    const p = planSession(pull, logs, { now, mastered, units: 'lb' });
    return { kind: p.kind, sets: p.sets, value: p.value, lb: toUnits(p.addedKg ?? 0, 'lb') };
  };

  it('starts light at the target reps', () => {
    expect(lbPlan([])).toEqual({ kind: 'start', sets: 3, value: 5, lb: 5 });
    expect(planSession(pull, [], { now, units: 'kg' }).addedKg).toBe(2.5);
  });

  it('adds one plate after a completed plan', () => {
    expect(lbPlan(lifts([3, 5, 20, [3, 5, 20]], [3, 5, 15, [3, 5, 15]]))).toEqual({ kind: 'progress', sets: 3, value: 5, lb: 25 });
  });

  it('repeats the weight after a near miss, and drops it after a big one', () => {
    expect(lbPlan(lifts([3, 4, 25, [3, 5, 25]], [3, 5, 20, [3, 5, 20]]))).toMatchObject({ kind: 'repeat', lb: 25 });
    expect(lbPlan(lifts([3, 5, 15, [3, 5, 25]], [3, 5, 20, [3, 5, 20]]))).toMatchObject({ kind: 'reset', lb: 15 });
  });

  it('gets all the reps at a weight before adding more', () => {
    expect(lbPlan(lifts([3, 3, 30]))).toMatchObject({ kind: 'repeat', value: 5, lb: 30 });
  });

  it('reaches mastery at the target weight shown in your units', () => {
    expect(lbPlan(lifts([3, 5, 45]))).toMatchObject({ kind: 'mastery', lb: 45 });
    expect(lbPlan(lifts([3, 5, 40]))).toMatchObject({ kind: 'progress', lb: 45 });
  });

  it('keeps adding weight after mastery while sessions go to plan', () => {
    expect(lbPlan(lifts([3, 5, 45, [3, 5, 45]]), true)).toMatchObject({ kind: 'progress', lb: 50 });
    expect(lbPlan(lifts([3, 4, 50, [3, 5, 50]]), true)).toMatchObject({ kind: 'maintain', lb: 50 });
  });

  it('counts the plates left to the target', () => {
    expect(sessionsToMastery(pull, { sets: 3, value: 5, addedKg: kg(35) }, 'lb')).toBe(1 + 2);
  });
});
