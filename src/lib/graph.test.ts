import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data';
import {
  ancestorsOf,
  goalProgress,
  logScore,
  meetsTarget,
  missingAncestors,
  newlyUnlocked,
  nextStepsToward,
  statusOf,
  withAncestors,
} from './graph';

const at = '2026-01-01T00:00:00.000Z';
const masteredOf = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, at]));

describe('statusOf', () => {
  it('treats exercises without prerequisites as available', () => {
    expect(statusOf('wall-pushup', {})).toBe('available');
  });

  it('locks an exercise until its prerequisites are mastered', () => {
    expect(statusOf('knee-pushup', {})).toBe('locked');
    expect(statusOf('knee-pushup', masteredOf('wall-pushup', 'incline-pushup'))).toBe('available');
    expect(statusOf('knee-pushup', masteredOf('knee-pushup'))).toBe('mastered');
  });

  it('requires every prerequisite of a multi-parent skill', () => {
    const base = withAncestors(['pushup', 'plank']);
    expect(statusOf('planche-lean', masteredOf(...base))).toBe('available');
    expect(statusOf('planche-lean', masteredOf(...base.filter((id) => id !== 'plank')))).toBe('locked');
  });
});

describe('ancestors', () => {
  it('walks the full progression chain', () => {
    expect([...ancestorsOf('pushup')].sort()).toEqual(['incline-pushup', 'knee-pushup', 'wall-pushup']);
  });

  it('crosses trees', () => {
    const a = ancestorsOf('bar-muscle-up');
    expect(a.has('pullup')).toBe(true);
    expect(a.has('straight-bar-dip')).toBe(true);
  });

  it('reports only missing ancestors', () => {
    expect(missingAncestors('pushup', masteredOf('wall-pushup')).sort()).toEqual([
      'incline-pushup',
      'knee-pushup',
    ]);
  });
});

describe('goals', () => {
  it('counts progress along the goal path', () => {
    expect(goalProgress('pushup', masteredOf('wall-pushup', 'incline-pushup'))).toEqual({
      done: 2,
      total: 4,
    });
  });

  it('suggests the unlocked steps on the path', () => {
    expect(nextStepsToward('pushup', masteredOf('wall-pushup')).map((e) => e.id)).toEqual([
      'incline-pushup',
    ]);
  });
});

describe('newlyUnlocked', () => {
  it('lists dependents that just became available', () => {
    const before = masteredOf(...withAncestors(['knee-pushup']));
    const after = { ...before, pushup: at };
    const ids = newlyUnlocked(before, after).map((e) => e.id).sort();
    expect(ids).toContain('diamond-pushup');
    expect(ids).toContain('decline-pushup');
    expect(ids).toContain('pike-pushup');
    expect(ids).not.toContain('planche-lean'); // still needs plank
  });
});

describe('targets', () => {
  const pushup = exerciseById['pushup']; // 3 × 12

  it('scores partial sessions', () => {
    expect(logScore(pushup, { sets: 3, value: 6 })).toBeCloseTo(0.5);
    expect(logScore(pushup, { sets: 5, value: 20 })).toBe(1);
  });

  it('detects when the target is met', () => {
    expect(meetsTarget(pushup, { sets: 3, value: 12 })).toBe(true);
    expect(meetsTarget(pushup, { sets: 2, value: 12 })).toBe(false);
  });

  it('needs the added weight on weighted exercises', () => {
    const pull = exerciseById['weighted-pullup']; // 3 × 5 at +20 kg
    expect(meetsTarget(pull, { sets: 3, value: 5 })).toBe(false);
    expect(meetsTarget(pull, { sets: 3, value: 5, addedKg: 20 })).toBe(true);
    expect(meetsTarget(pull, { sets: 3, value: 5, addedKg: 19.995 })).toBe(true); // rounding from lb
    expect(logScore(pull, { sets: 3, value: 5, addedKg: 10 })).toBeCloseTo(0.5);
  });
});
