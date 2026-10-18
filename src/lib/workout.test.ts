import { describe, expect, it } from 'vitest';
import { trees, type TreeId } from '../data';
import { drills } from '../data/drills';
import { splitById, splits, weeklyPlans } from '../data/splits';
import { initialProgress, type ProgressState } from '../state/progress';
import { statusOf, withAncestors } from './graph';
import { planSession } from './progression';
import { daysSinceTrained, generateWorkout, suggestSplit } from './workout';

const now = new Date('2026-10-18T12:00:00');
const at = '2026-01-01T00:00:00.000Z';
const masteredOf = (...ids: string[]) => Object.fromEntries(withAncestors(ids).map((id) => [id, at]));
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

const intermediate: ProgressState = {
  ...initialProgress,
  mastered: masteredOf('pushup', 'dip', 'pullup', 'australian-row', 'chest-to-wall-handstand', 'hollow-body-hold', 'squat'),
};

describe('drill and split data', () => {
  it('has unique drill ids and valid focus trees', () => {
    expect(new Set(drills.map((d) => d.id)).size).toBe(drills.length);
    const ids = new Set(trees.map((t) => t.id));
    for (const d of drills) if (d.focus !== 'all') for (const t of d.focus) expect(ids.has(t), d.id).toBe(true);
  });

  it('has warm-up and cooldown drills for every tree', () => {
    for (const t of trees) {
      for (const phase of ['warmup', 'cooldown'] as const) {
        const ok = drills.some((d) => d.phase === phase && d.focus !== 'all' && d.focus.includes(t.id));
        expect(ok, `${phase} for ${t.id}`).toBe(true);
      }
    }
  });

  it('only schedules splits that exist', () => {
    for (const w of weeklyPlans) for (const s of w.schedule) expect(splitById[s.split], s.split).toBeDefined();
  });
});

describe('generateWorkout', () => {
  it('runs warm-up → main → cooldown, starting with a pulse raiser and ending with breathing', () => {
    const w = generateWorkout(intermediate, ['push'], 'standard', now);
    expect(w.warmup[0].id).toBe('pulse');
    expect(w.cooldown.at(-1)!.id).toBe('breathing');
    expect(w.warmup.some((d) => d.focus !== 'all' && d.focus.includes('push'))).toBe(true);
    expect(w.cooldown.some((d) => d.focus !== 'all' && d.focus.includes('push'))).toBe(true);
  });

  it('only prescribes exercises at your current level in the chosen trees', () => {
    const w = generateWorkout(intermediate, ['push', 'pull'], 'long', now);
    expect(w.main.length).toBeGreaterThan(2);
    for (const m of w.main) {
      expect(['push', 'pull']).toContain(m.exercise.tree);
      expect(statusOf(m.exercise.id, intermediate.mastered)).toBe('available');
    }
  });

  it('uses the progression plan for the sets and reps', () => {
    const state: ProgressState = {
      ...intermediate,
      logs: { 'diamond-pushup': [{ id: 'a', date: daysAgo(2), sets: 3, value: 5 }] },
    };
    const w = generateWorkout(state, ['push'], 'standard', now);
    const diamond = w.main.find((m) => m.exercise.id === 'diamond-pushup')!;
    expect(diamond.plan).toEqual(planSession(diamond.exercise, state.logs['diamond-pushup'], { now }));
    expect(diamond.plan).toMatchObject({ sets: 3, value: 6 });
  });

  it('shares the exercises across several trees and puts skill work first', () => {
    const w = generateWorkout(intermediate, ['push', 'pull', 'handstand'], 'standard', now);
    const count = (t: TreeId) => w.main.filter((m) => m.focus === t).length;
    expect(w.main).toHaveLength(5);
    expect(count('push')).toBe(2);
    expect(count('pull')).toBe(2);
    expect(count('handstand')).toBe(1);
    expect(w.main[0].block).toBe('skill');
    const blocks = w.main.map((m) => m.block);
    expect(blocks).toEqual([...blocks].sort((a, b) => ['skill', 'strength', 'core'].indexOf(a) - ['skill', 'strength', 'core'].indexOf(b)));
  });

  it('builds toward a tree that is not unlocked yet', () => {
    const w = generateWorkout(initialProgress, ['planche'], 'standard', now);
    expect(w.notes.some((n) => /Planche isn't unlocked yet/.test(n))).toBe(true);
    expect(w.main.length).toBeGreaterThan(0);
    for (const m of w.main) {
      expect(m.why).toBe('Builds toward Planche');
      expect(statusOf(m.exercise.id, initialProgress.mastered)).toBe('available');
    }
  });

  it('prioritises the path to your goals', () => {
    const state: ProgressState = { ...intermediate, goals: ['bar-muscle-up'] };
    const w = generateWorkout(state, ['pull'], 'short', now);
    expect(w.main[0].exercise.id).toBe('chest-to-bar-pullup');
    expect(w.main[0].why).toBe('Toward Bar Muscle-up');
  });

  it('scales with the chosen length', () => {
    const short = generateWorkout(intermediate, ['push', 'pull'], 'short', now);
    const long = generateWorkout(intermediate, ['push', 'pull'], 'long', now);
    expect(long.main.length).toBeGreaterThan(short.main.length);
    expect(long.warmup.length).toBeGreaterThan(short.warmup.length);
    expect(long.minutes).toBeGreaterThan(short.minutes);
    expect(short.minutes).toBeGreaterThan(10);
  });

  it('gives the same workout regardless of selection order', () => {
    const a = generateWorkout(intermediate, ['pull', 'push'], 'standard', now);
    const b = generateWorkout(intermediate, ['push', 'pull'], 'standard', now);
    expect(a.main.map((m) => m.exercise.id)).toEqual(b.main.map((m) => m.exercise.id));
  });
});

describe('suggestSplit', () => {
  it('starts new users on full body', () => {
    expect(suggestSplit(initialProgress, now).split.id).toBe('full-body');
  });

  it('picks the most rested areas and skips what you trained yesterday', () => {
    const state: ProgressState = {
      ...intermediate,
      mastered: { ...intermediate.mastered, ...masteredOf('plank') },
      logs: {
        'diamond-pushup': [{ id: 'a', date: daysAgo(1), sets: 3, value: 5 }],
        'chest-to-bar-pullup': [{ id: 'b', date: daysAgo(1), sets: 3, value: 3 }],
        'split-squat': [{ id: 'c', date: daysAgo(5), sets: 3, value: 8 }],
        'hollow-rock': [{ id: 'd', date: daysAgo(6), sets: 3, value: 10 }],
      },
    };
    expect(daysSinceTrained('push', state, now)).toBe(1);
    expect(daysSinceTrained('handstand', state, now)).toBe(Infinity);
    const s = suggestSplit(state, now);
    expect(s.split.id).toBe('legs-core');
    expect(s.reason).toMatch(/Legs 5 days ago, Core 6 days ago/);
    expect(s.split.focus).not.toContain('push');

    // Once legs are trained too, the rotation moves on to handstand + core.
    const next = { ...state, logs: { ...state.logs, 'split-squat': [{ id: 'e', date: daysAgo(1), sets: 3, value: 8 }] } };
    const s2 = suggestSplit(next, now);
    expect(s2.split.id).toBe('handstand-core');
    expect(s2.reason).toMatch(/Handstand not yet/);
  });

  it('only suggests splits that exist', () => {
    expect(splits.map((s) => s.id)).toContain(suggestSplit(intermediate, now).split.id);
  });
});
