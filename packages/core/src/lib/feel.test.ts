import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data';
import { fromDocs, toDocs } from '../cloud/documents';
import { mergeProgress } from '../cloud/merge';
import { feedbackFor, type ActiveWorkout } from '../state/activeWorkout';
import { initialProgress, progressReducer, sanitizeProgress, type Feel, type LogEntry, type ProgressState } from '../state/progress';
import { isLevelUp, planSession } from './progression';
import { workFromSets } from './sets';

const now = new Date('2026-10-18T12:00:00.000Z');
const pushup = exerciseById['pushup']; // 3 × 12 reps, steps of 1
const dip = exerciseById['weighted-dip']; // 3 × 6 at +20 kg

const session = (sets: number[], feel?: Feel, { daysAgo = 1, addedKg }: { daysAgo?: number; addedKg?: number } = {}): LogEntry => ({
  id: 'b',
  date: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  ...workFromSets(sets, addedKg),
  planned: { sets: 3, value: sets[0], ...(addedKg !== undefined && { addedKg }) },
  ...(feel && { feel }),
});
const before: LogEntry = { id: 'a', date: '2026-10-15T12:00:00.000Z', sets: 3, value: 8, planned: { sets: 3, value: 8 } };

describe('how a session felt', () => {
  it('eases off after a session you said was too hard', () => {
    const plan = planSession(pushup, [session([10, 10, 10], 'hard'), before], { now });
    expect(plan).toMatchObject({ kind: 'easier', sets: 3, value: 9 });
    expect(plan.reason).toContain('too hard');
    expect(isLevelUp(plan)).toBe(false);
    // From the typical set when they differed.
    expect(planSession(pushup, [session([10, 9, 8], 'hard'), before], { now })).toMatchObject({ kind: 'easier', value: 8 });
  });

  it('jumps ahead after a session you said was too easy, up to the target', () => {
    const plan = planSession(pushup, [session([8, 8, 8], 'easy'), before], { now });
    expect(plan).toMatchObject({ kind: 'harder', sets: 3, value: 10 });
    expect(isLevelUp(plan)).toBe(true);
    expect(planSession(pushup, [session([11, 11], 'easy'), before], { now })).toMatchObject({ sets: 3, value: 12 });
  });

  it('only changes the next session, and not after a long break', () => {
    const next = planSession(pushup, [session([9, 9, 9]), session([10, 10, 10], 'hard', { daysAgo: 3 })], { now });
    expect(next.kind).not.toBe('easier');
    expect(planSession(pushup, [session([10, 10, 10], 'easy', { daysAgo: 20 })], { now }).kind).toBe('return');
  });

  it('moves weighted exercises by load', () => {
    const units = 'kg';
    expect(planSession(dip, [session([6, 6, 6], 'hard', { addedKg: 10 }), before], { now, units })).toMatchObject({
      kind: 'easier',
      value: 6,
      addedKg: 7.5,
    });
    expect(planSession(dip, [session([6, 6, 6], 'easy', { addedKg: 10 }), before], { now, units })).toMatchObject({
      kind: 'harder',
      addedKg: 15,
    });
    // Mastered: no ceiling.
    const mastered = planSession(dip, [session([6, 6, 6], 'easy', { addedKg: 25 })], { now, units, mastered: true });
    expect(mastered).toMatchObject({ kind: 'harder', addedKg: 30 });
  });

  it('adjusts mastered exercises too', () => {
    expect(planSession(pushup, [session([14, 14, 14], 'easy')], { now, mastered: true })).toMatchObject({ kind: 'harder', value: 16 });
    expect(planSession(pushup, [session([12, 12, 12], 'hard')], { now, mastered: true })).toMatchObject({ kind: 'easier', value: 11 });
  });
});

describe('feedbackFor', () => {
  const active = {
    main: [
      { exerciseId: 'pushup', logged: { sets: 3, value: 9, logId: 'p' } },
      { exerciseId: 'dip', logged: { sets: 3, value: 8, logId: 'd' } },
      { exerciseId: 'plank' }, // not logged: nothing to adjust
    ],
  } as unknown as ActiveWorkout;

  it('marks only the logged exercises you picked, and only when it was too easy or too hard', () => {
    expect(feedbackFor(active, 'hard', ['pushup', 'plank'])).toEqual([{ exerciseId: 'pushup', logId: 'p', feel: 'hard' }]);
    expect(feedbackFor(active, 'easy', ['pushup', 'dip']).map((f) => f.feel)).toEqual(['easy', 'easy']);
    expect(feedbackFor(active, 'right', ['pushup'])).toEqual([]);
    expect(feedbackFor(active, null, ['pushup'])).toEqual([]);
  });
});

describe('saving how it felt', () => {
  const day = '2026-10-17';
  const startedAt = '2026-10-17T11:00:00.000Z';
  const state: ProgressState = {
    ...initialProgress,
    logs: { pushup: [{ ...session([10, 9, 8]), day }] },
    workouts: { [day]: [{ title: 'Push', focus: ['push'], length: 'standard', startedAt }] },
  };

  it('marks the session and the workout', () => {
    let next = progressReducer(state, { type: 'rateLog', exerciseId: 'pushup', logId: 'b', feel: 'hard', at: 't1' });
    expect(next.logs.pushup[0]).toMatchObject({ feel: 'hard', edited: 't1', perSet: [10, 9, 8] });
    next = progressReducer(next, { type: 'finishWorkout', day, startedAt, at: '2026-10-17T12:00:00.000Z', rating: 'hard' });
    expect(next.workouts[day][0]).toMatchObject({ rating: 'hard', finishedAt: '2026-10-17T12:00:00.000Z' });

    const cleared = progressReducer(next, { type: 'rateLog', exerciseId: 'pushup', logId: 'b', feel: null, at: 't2' });
    expect(cleared.logs.pushup[0]).not.toHaveProperty('feel');

    // Through the cloud and a reload.
    expect(sanitizeProgress(fromDocs(toDocs(next)))).toMatchObject({ logs: next.logs, workouts: next.workouts });
    expect(sanitizeProgress({ ...next, logs: { pushup: [{ ...next.logs.pushup[0], feel: 'meh' }] } })!.logs.pushup[0]).not.toHaveProperty('feel');
  });

  it('keeps the rating when the other device only has the finished workout', () => {
    const finished = { title: 'Push', focus: ['push' as const], length: 'standard' as const, startedAt, finishedAt: '2026-10-17T12:00:00.000Z' };
    const rated: ProgressState = { ...state, workouts: { [day]: [{ ...finished, rating: 'easy' }] } };
    const plain: ProgressState = { ...state, workouts: { [day]: [finished] } };
    expect(mergeProgress(rated, plain).workouts[day][0].rating).toBe('easy');
    expect(mergeProgress(plain, rated).workouts[day][0].rating).toBe('easy');
  });
});
