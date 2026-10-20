import { describe, expect, it } from 'vitest';
import { drillById, drillVideo } from '../data/drills';
import { routineById, routineMinutes, routines } from '../data/routines';
import { initialProgress, localDay, sanitizeProgress, type ProgressState, type WorkoutRecord } from '../state/progress';
import { fromDocs, toDocs } from '../cloud/documents';
import { routineCalories } from './calories';
import { routineSteps } from './guided';
import { lastDoneByRoutine, routineDaysInLast, routinesDoneOn, suggestRoutine } from './routines';

const now = new Date('2026-10-19T08:00:00');
const today = localDay(now);
const dayAgo = (n: number) => localDay(new Date(now.getTime() - n * 86_400_000));

const done = (routine: string, day: string): WorkoutRecord => ({
  title: `Daily mobility: ${routineById[routine].name}`,
  focus: ['mobility'],
  length: 'short',
  startedAt: `${day}T07:00:00.000Z`,
  finishedAt: `${day}T07:08:00.000Z`,
  kcal: 25,
  routine,
});
const withRoutines = (...list: WorkoutRecord[]): ProgressState => {
  const workouts: ProgressState['workouts'] = {};
  for (const w of list) {
    const day = w.startedAt.slice(0, 10);
    workouts[day] = [...(workouts[day] ?? []), w];
  }
  return { ...initialProgress, workouts };
};

describe('daily mobility routines', () => {
  it('covers the upper back, shoulders, hips and legs, plus a full-body flow', () => {
    expect(routines.map((r) => r.id)).toEqual(['wake-up', 'upper-back', 'shoulders', 'hips', 'legs']);
  });

  it('uses real drills, each with a demo video, and takes 5 to 12 minutes', () => {
    for (const r of routines) {
      for (const id of r.moves) {
        expect(drillById[id], `${r.id}: ${id}`).toBeDefined();
        expect(drillVideo(drillById[id]), `${r.id}: ${id}`).toBeDefined();
      }
      expect(new Set(r.moves).size, r.id).toBe(r.moves.length);
      expect(routineMinutes(r), r.id).toBeGreaterThanOrEqual(5);
      expect(routineMinutes(r), r.id).toBeLessThanOrEqual(12);
      expect(routineCalories(r, 75), r.id).toBeGreaterThan(0);
    }
  });

  it('plays every move in order, timed ones per side', () => {
    const steps = routineSteps(routineById['upper-back']);
    expect([...new Set(steps.map((s) => s.id))]).toEqual(routineById['upper-back'].moves);
    expect(steps.every((s) => s.phase === 'mobility' && s.kind === 'drill')).toBe(true);
    const reach = steps.filter((s) => s.id === 'childs-pose-reach');
    expect(reach.map((s) => [s.seconds, s.side?.label])).toEqual([
      [30, 'Reach to the left'],
      [30, 'Reach to the right'],
    ]);
    expect(steps.at(-1)!.rest).toBe(0);
  });

  it('keeps mobility-only moves out of workout warm-ups and cooldowns', () => {
    expect(drillById['worlds-greatest-stretch'].phase).toBe('mobility');
  });
});

describe('tracking routines', () => {
  it('knows what was done today, recently and when each was last done', () => {
    const state = withRoutines(done('hips', today), done('wake-up', dayAgo(2)), done('hips', dayAgo(5)));
    expect(routinesDoneOn(state, today)).toEqual(['hips']);
    expect(routineDaysInLast(state, 7, now)).toBe(3);
    expect(routineDaysInLast(state, 2, now)).toBe(1);
    expect(lastDoneByRoutine(state).get('hips')).toBe(today);
  });

  it('ignores unfinished routines and normal workouts', () => {
    const unfinished = { ...done('legs', today), finishedAt: undefined };
    const workout: WorkoutRecord = { title: 'Push', focus: ['push'], length: 'short', startedAt: `${today}T18:00:00.000Z`, finishedAt: `${today}T18:40:00.000Z` };
    expect(routinesDoneOn(withRoutines(unfinished, workout), today)).toEqual([]);
  });

  it('survives a reload, an import and a sync', () => {
    const state = withRoutines(done('shoulders', today));
    const reloaded = sanitizeProgress(JSON.parse(JSON.stringify(state)))!;
    expect(reloaded.workouts[today][0].routine).toBe('shoulders');
    expect(sanitizeProgress(fromDocs(toDocs(state)))!.workouts[today][0].routine).toBe('shoulders');
    const unknown = sanitizeProgress({ ...state, workouts: { [today]: [{ ...done('shoulders', today), routine: 'nope' }] } })!;
    expect(unknown.workouts[today][0].routine).toBeUndefined();
  });
});

describe("today's pick", () => {
  it('starts new people with the wake-up flow', () => {
    expect(suggestRoutine(initialProgress, now).routine.id).toBe('wake-up');
  });

  it('suggests something not done yet, and never repeats one already done today', () => {
    const state = withRoutines(done('wake-up', today));
    const pick = suggestRoutine(state, now);
    expect(pick.routine.id).not.toBe('wake-up');
    expect(pick.reason).toBe("You haven't tried this one yet.");
  });

  it('leans toward areas trained in the last two days', () => {
    const state: ProgressState = {
      ...withRoutines(...routines.map((r) => done(r.id, dayAgo(3)))),
      logs: { pushup: [{ id: 'a', date: new Date(now.getTime() - 86_400_000).toISOString(), sets: 3, value: 10 }] },
    };
    const pick = suggestRoutine(state, now);
    expect(pick.routine.id).toBe('shoulders');
    expect(pick.reason).toBe('Good after training Push recently.');
  });

  it('otherwise picks the one you have gone longest without', () => {
    const state = withRoutines(
      done('wake-up', dayAgo(1)),
      done('upper-back', dayAgo(2)),
      done('shoulders', dayAgo(6)),
      done('hips', dayAgo(3)),
      done('legs', dayAgo(4)),
    );
    const pick = suggestRoutine(state, now);
    expect(pick.routine.id).toBe('shoulders');
    expect(pick.reason).toBe('Last done 6 days ago.');
  });
});
