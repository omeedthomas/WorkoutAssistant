import { describe, expect, it } from 'vitest';
import { exerciseById, trackByKey } from '../data';
import { easierStep, swapExercise, type ActiveExercise, type ActiveWorkout } from '../state/activeWorkout';
import { initialProgress, sanitizeProgress, type ProgressState } from '../state/progress';
import { firstStepOf, guidedSteps } from './guided';

const now = new Date('2026-10-23T12:00:00.000Z');
const item = (exerciseId: string, extra: Partial<ActiveExercise> = {}): ActiveExercise => ({
  exerciseId,
  sets: 3,
  value: 10,
  kind: 'progress',
  reason: 'You hit it last time.',
  why: 'Your current step in Pull-ups',
  block: 'strength',
  ...extra,
});
const workout = (...main: ActiveExercise[]): ActiveWorkout => ({
  day: now.toDateString(),
  startedAt: now.toISOString(),
  focus: ['pull'],
  length: 'standard',
  warmup: ['pulse'],
  main,
  cooldown: [],
  notes: [],
  checked: [],
  guided: true,
  position: 0,
});

describe('easier steps on the way to a pull-up', () => {
  it('has assisted versions before scapular pulls and before negatives', () => {
    const ladder = trackByKey['pull/pullups'].steps.map((s) => s.id);
    expect(ladder.slice(0, 6)).toEqual([
      'dead-hang',
      'assisted-scapular-pull',
      'scapular-pull',
      'flexed-arm-hang',
      'assisted-pullup',
      'negative-pullup',
    ]);
  });

  it("doesn't send anyone back down: a later step reached counts the new one as mastered", () => {
    const load = (p: Partial<ProgressState>) => sanitizeProgress({ ...initialProgress, ...p })!.mastered;
    const pastScaps = load({ mastered: { 'dead-hang': '2026-09-01', 'scapular-pull': '2026-09-10' } });
    expect(pastScaps['assisted-scapular-pull']).toBe('2026-09-10');
    // Training negatives (logged, not mastered) is past the assisted pull-up too.
    const onNegatives = load({
      mastered: { 'flexed-arm-hang': '2026-09-20' },
      logs: { 'negative-pullup': [{ id: 'n2', date: '2026-10-02T10:00:00.000Z', sets: 3, value: 3 }, { id: 'n1', date: '2026-09-28T10:00:00.000Z', sets: 3, value: 2 }] },
    });
    expect(onNegatives['assisted-pullup']).toBe('2026-09-28T10:00:00.000Z');
    // Someone who's only done dead hangs gets the new step in their workouts.
    expect(load({ mastered: { 'dead-hang': '2026-09-01' } })).not.toHaveProperty('assisted-scapular-pull');
  });
});

describe('easierStep', () => {
  it('is the previous step of the progression', () => {
    expect(easierStep(workout(item('scapular-pull')), 'scapular-pull', null)?.id).toBe('assisted-scapular-pull');
    expect(easierStep(workout(item('pullup')), 'pullup', null)?.id).toBe('negative-pullup');
    expect(easierStep(workout(item('dead-hang')), 'dead-hang', null)).toBeNull();
  });

  it('steps back into the progression a track starts from', () => {
    expect(easierStep(workout(item('chinup')), 'chinup', null)?.id).toBe('negative-pullup');
    expect(easierStep(workout(item('l-sit-pullup')), 'l-sit-pullup', null)?.id).toBe('pullup');
  });

  it('skips steps already in the workout, and ones you lack the equipment for', () => {
    expect(easierStep(workout(item('pullup'), item('negative-pullup')), 'pullup', null)?.id).toBe('assisted-pullup');
    expect(easierStep(workout(item('scapular-pull')), 'scapular-pull', [])).toBeNull(); // no bar: nothing easier you can do here
    expect(easierStep(workout(item('pushup')), 'pushup', [])).not.toBeNull();
  });
});

describe('swapExercise', () => {
  const state: ProgressState = {
    ...initialProgress,
    logs: { 'assisted-scapular-pull': [{ id: 'a', date: '2026-10-20T10:00:00.000Z', sets: 3, value: 10, planned: { sets: 3, value: 10 } }] },
  };
  const w = workout(item('australian-row'), item('scapular-pull', { sets: 3, value: 8 }));

  it('switches to the easier step with its own plan, and starts the player on it', () => {
    const next = swapExercise(w, 'scapular-pull', 'assisted-scapular-pull', state, now);
    const swapped = next.main[1];
    expect(swapped).toMatchObject({ exerciseId: 'assisted-scapular-pull', sets: 3, value: 11, why: 'Easier than Scapular Pull' });
    expect(swapped.swappedFrom).toMatchObject({ exerciseId: 'scapular-pull', value: 8 });
    expect(next.main[0]).toBe(w.main[0]);
    expect(next.position).toBe(firstStepOf(guidedSteps(next, 'lb'), 'exercise', 'assisted-scapular-pull'));
    expect(guidedSteps(next, 'lb')[next.position]).toMatchObject({ id: 'assisted-scapular-pull', set: 1 });
  });

  it('switches back to the original as it was planned, even after going further down', () => {
    const easier = swapExercise(w, 'scapular-pull', 'assisted-scapular-pull', state, now);
    const easiest = swapExercise(easier, 'assisted-scapular-pull', 'dead-hang', state, now);
    expect(easiest.main[1].swappedFrom?.exerciseId).toBe('scapular-pull');
    const back = swapExercise(easiest, 'dead-hang', 'scapular-pull', state, now);
    expect(back.main[1]).toEqual(w.main[1]);
  });

  it('leaves logged exercises and duplicates alone', () => {
    const logged = workout(item('scapular-pull', { logged: { sets: 3, value: 8, logId: 'x' } }));
    expect(swapExercise(logged, 'scapular-pull', 'assisted-scapular-pull', state, now)).toBe(logged);
    expect(swapExercise(w, 'scapular-pull', 'australian-row', state, now)).toBe(w);
    expect(exerciseById['assisted-scapular-pull'].addedAt).toBe('2026-10-23');
  });
});
