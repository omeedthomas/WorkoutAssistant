import { describe, expect, it } from 'vitest';
import { exerciseById, exercises } from '../data';
import { equipmentById } from '../data/equipment';
import { initialProgress, type ProgressState } from '../state/progress';
import { accessTo, alternativesTo, canDo, describeNeeds } from './equipment';
import { generateWorkout } from './workout';

const ex = (id: string) => exerciseById[id];

describe('accessTo', () => {
  it('assumes everything until you say what you have', () => {
    expect(accessTo(ex('pullup'), null)).toEqual({ kind: 'ready' });
  });

  it('needs nothing for floor and household exercises', () => {
    expect(accessTo(ex('pushup'), [])).toEqual({ kind: 'ready' });
    expect(accessTo(ex('australian-row'), [])).toEqual({ kind: 'ready' }); // under a sturdy table
  });

  it('accepts any one of the listed equipment', () => {
    expect(accessTo(ex('pullup'), ['rings'])).toEqual({ kind: 'ready' });
  });

  it('suggests a stand-in when one works', () => {
    expect(accessTo(ex('dip'), [])).toMatchObject({ kind: 'substitute', note: expect.stringContaining('chairs') });
    expect(accessTo(ex('kettlebell-swing'), ['dumbbells'])).toMatchObject({ kind: 'substitute', note: expect.stringContaining('dumbbell') });
  });

  it('reports what is missing when nothing will do', () => {
    expect(accessTo(ex('pullup'), [])).toEqual({ kind: 'missing', needs: ['pullup-bar', 'rings'] });
    expect(accessTo(ex('bosu-handstand'), ['stability-ball'])).toEqual({ kind: 'missing', needs: ['bosu'] });
  });
});

describe('alternativesTo', () => {
  it('offers exercises you can actually do, nearest first', () => {
    const alts = alternativesTo(ex('pullup'), []);
    expect(alts.length).toBeGreaterThan(0);
    expect(alts.every((a) => canDo(a, []))).toBe(true);
    expect(alts.map((a) => a.id)).toContain('australian-row');
  });

  it('puts the hand-picked alternatives first', () => {
    expect(alternativesTo(ex('band-external-rotation'), [])[0].id).toBe('side-lying-external-rotation');
    expect(alternativesTo(ex('tuck-front-lever'), []).map((a) => a.id).slice(0, 2)).toEqual(['hollow-body-hold', 'feet-elevated-row']);
  });
});

describe('equipment data', () => {
  it('only uses known equipment, and alternatives that exist', () => {
    for (const e of exercises) {
      for (const need of e.equipment ?? []) expect(equipmentById[need], `${e.id} needs ${need}`).toBeDefined();
      for (const alt of e.alternatives ?? []) expect(exerciseById[alt], `${e.id} → ${alt}`).toBeDefined();
    }
  });

  it('describes what an exercise needs in plain words', () => {
    expect(describeNeeds(['pullup-bar', 'rings'])).toBe('a pull-up bar or gymnastic rings');
    expect(describeNeeds(['bosu'])).toBe('a BOSU ball');
    expect(describeNeeds(['dumbbells'])).toBe('dumbbells');
  });
});

describe('workouts with your equipment', () => {
  const now = new Date('2026-10-18T12:00:00');
  const at = '2026-01-01T00:00:00.000Z';
  const noGear: ProgressState = {
    ...initialProgress,
    mastered: Object.fromEntries(['dead-hang', 'scapular-pull', 'flexed-arm-hang', 'incline-row', 'australian-row', 'negative-pullup', 'bench-dip'].map((id) => [id, at])),
    equipment: { have: [], at },
  };

  it('swaps out what you cannot do and explains how to set up the rest', () => {
    const w = generateWorkout(noGear, ['push', 'pull'], 'long', now);
    expect(w.main.every((m) => canDo(m.exercise, []))).toBe(true);
    expect(w.main.some((m) => m.why.startsWith('Instead of'))).toBe(true);
    expect(w.notes.some((n) => n.includes('equipment'))).toBe(true);
    const dips = w.main.find((m) => m.exercise.equipment?.includes('dip-bars'));
    if (dips) expect(dips.setup).toContain('chairs');
  });

  it('leaves everything in when your equipment is not set', () => {
    const w = generateWorkout({ ...noGear, equipment: null }, ['pull'], 'standard', now);
    expect(w.main.some((m) => m.exercise.equipment?.includes('pullup-bar'))).toBe(true);
  });

  it('builds physical therapy workouts from what you have', () => {
    const w = generateWorkout({ ...initialProgress, equipment: { have: [], at } }, ['shoulder', 'lower-back', 'hips', 'mobility'], 'standard', now);
    expect(w.main.length).toBeGreaterThan(0);
    expect(w.main.every((m) => m.block === 'therapy' && canDo(m.exercise, []))).toBe(true);
  });
});
