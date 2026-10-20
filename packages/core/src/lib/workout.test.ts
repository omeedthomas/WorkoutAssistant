import { describe, expect, it } from 'vitest';
import { trees, type TreeId } from '../data';
import { drills } from '../data/drills';
import { splitById, splits, weeklyPlans } from '../data/splits';
import { initialProgress, type ProgressState } from '../state/progress';
import { statusOf, withAncestors } from './graph';
import { planSession } from './progression';
import { daysSinceTrained, generateWorkout, mainCount, minutesByLength, suggestSplit } from './workout';

const now = new Date('2026-10-18T12:00:00');
const at = '2026-01-01T00:00:00.000Z';
const masteredOf = (...ids: string[]) => Object.fromEntries(withAncestors(ids).map((id) => [id, at]));
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const pick = ({ sets, value }: { sets: number; value: number }) => ({ sets, value });

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

  it('prescribes your current steps in the chosen trees, plus a mastered one to keep sharp', () => {
    const w = generateWorkout(intermediate, ['push', 'pull'], 'long', now);
    expect(w.main.length).toBeGreaterThan(2);
    for (const m of w.main) {
      expect(['push', 'pull']).toContain(m.exercise.tree);
      if (m.why === 'Mastered: keep it sharp') expect(statusOf(m.exercise.id, intermediate.mastered)).toBe('mastered');
      else expect(statusOf(m.exercise.id, intermediate.mastered)).toBe('available');
    }
  });

  it('gives every chosen area at least two exercises, basic movements first', () => {
    const areas: TreeId[] = ['push', 'pull', 'core', 'legs', 'handstand'];
    for (const length of ['short', 'standard', 'long'] as const) {
      const w = generateWorkout(intermediate, areas, length, now);
      expect(w.main).toHaveLength(mainCount(length, areas.length));
      for (const t of areas) expect(w.main.filter((m) => m.focus === t).length, `${length} ${t}`).toBeGreaterThanOrEqual(2);
    }
    // Dips as well as push-ups, glute bridges as well as squats.
    const tracksOf = (t: TreeId) =>
      generateWorkout(intermediate, areas, 'short', now).main.filter((m) => m.focus === t).map((m) => m.exercise.track);
    expect(tracksOf('push')).toEqual(expect.arrayContaining(['push/dips', 'push/pushups']));
    expect(tracksOf('legs')).toEqual(expect.arrayContaining(['legs/squat', 'legs/hinge']));
    const beginner = generateWorkout(initialProgress, areas, 'standard', now).main;
    expect(beginner.map((m) => m.exercise.id)).toEqual(
      expect.arrayContaining(['wall-pushup', 'bench-dip', 'assisted-squat', 'glute-bridge', 'dead-bug', 'plank']),
    );
    // Core and Push take Handstand's lead-ins, so Handstand gets its own first steps, a little ahead.
    expect(beginner.filter((m) => m.focus === 'handstand').map((m) => m.exercise.id)).toEqual(['elevated-pike-hold', 'wall-walk']);
  });

  it('gives every area at least two exercises for any tree, alone or with the base trees, at any level', () => {
    const noGear: ProgressState = { ...initialProgress, equipment: { have: [], at } };
    const base: TreeId[] = ['push', 'pull', 'core', 'legs'];
    const selections = [...trees.map((t) => [t.id]), ...trees.map((t) => [...new Set([...base, t.id])]), trees.map((t) => t.id)];
    for (const state of [initialProgress, noGear, intermediate]) {
      for (const focus of selections) {
        for (const length of ['short', 'standard', 'long'] as const) {
          const w = generateWorkout(state, focus, length, now);
          for (const t of focus) expect(w.main.filter((m) => m.focus === t).length, `${focus.join('+')} ${length}: ${t}`).toBeGreaterThanOrEqual(2);
          expect(new Set(w.main.map((m) => m.exercise.id)).size).toBe(w.main.length);
        }
      }
    }
  });

  it('scales the number of exercises with the areas and the length', () => {
    expect([1, 2, 5].map((n) => mainCount('short', n))).toEqual([3, 4, 10]);
    expect([1, 2, 5].map((n) => mainCount('standard', n))).toEqual([5, 6, 12]);
    expect([1, 2, 5].map((n) => mainCount('long', n))).toEqual([7, 8, 16]);
    const minutes = minutesByLength(intermediate, ['push', 'pull'], now);
    expect(minutes.short).toBeLessThan(minutes.standard);
    expect(minutes.standard).toBeLessThan(minutes.long);
  });

  it("leaves another chosen area's steps to that area when building toward a locked tree", () => {
    // Plank leads into Handstand, but Core trains it, so Core still gets two exercises of its own.
    const w = generateWorkout(initialProgress, ['core', 'handstand'], 'standard', now);
    const plank = w.main.filter((m) => m.exercise.id === 'plank');
    expect(plank).toHaveLength(1);
    expect(plank[0].focus).toBe('core');
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
    expect(w.main).toHaveLength(9);
    expect(count('push')).toBe(3);
    expect(count('pull')).toBe(3);
    expect(count('handstand')).toBe(3);
    expect(w.main[0].block).toBe('skill');
    const blocks = w.main.map((m) => m.block);
    expect(blocks).toEqual([...blocks].sort((a, b) => ['skill', 'strength', 'core'].indexOf(a) - ['skill', 'strength', 'core'].indexOf(b)));
  });

  it('builds toward a tree that is not unlocked yet', () => {
    const w = generateWorkout(initialProgress, ['planche'], 'standard', now);
    expect(w.notes.some((n) => /Planche isn't unlocked yet/.test(n))).toBe(true);
    expect(w.main.length).toBeGreaterThan(0);
    // The unlocked steps that lead into it first, then (to fill the session) its first steps a little ahead.
    const leadIns = w.main.filter((m) => m.why === 'Builds toward Planche');
    expect(leadIns.length).toBeGreaterThan(0);
    for (const m of leadIns) expect(statusOf(m.exercise.id, initialProgress.mastered)).toBe('available');
    for (const m of w.main.filter((m) => !leadIns.includes(m))) expect(m.why).toMatch(/^A step ahead/);
    expect(w.main.map((m) => m.exercise.id)).toContain('frog-stand');
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

  it('brings a mastered exercise back about once a week, without crowding out progress', () => {
    const maintained = (s: ProgressState) =>
      generateWorkout(s, ['push'], 'short', now)
        .main.filter((m) => m.why === 'Mastered: keep it sharp')
        .map((m) => m.exercise.id);
    const log = (id: string, days: number) => ({ [id]: [{ id, date: daysAgo(days), sets: 3, value: 10 }] });

    // Mastered long ago: the hardest mastered step of a progression comes back, right after the first exercise.
    const w = generateWorkout(intermediate, ['push'], 'short', now);
    expect(w.main[1].why).toBe('Mastered: keep it sharp');
    const first = w.main[1].exercise.id;
    expect(['pushup', 'dip']).toContain(first);
    expect(w.main[1].plan).toMatchObject({ kind: 'maintain', ...pick(w.main[1].exercise.target) });
    const other = first === 'pushup' ? 'dip' : 'pushup';

    // Done 5 days ago: not due yet, so the other one comes back instead.
    expect(maintained({ ...intermediate, logs: log(first, 5) })).toEqual([other]);
    // Maintained yesterday: Push gets a few days of pure progress first.
    expect(maintained({ ...intermediate, logs: log(first, 1) })).toEqual([]);
  });

  it('asks for more than the target once you keep hitting it on a mastered exercise', () => {
    const logs = {
      pushup: [{ id: 'p', date: daysAgo(10), sets: 3, value: 12, planned: { sets: 3, value: 12 } }], // target 3 × 12
      dip: [{ id: 'd', date: daysAgo(3), sets: 3, value: 10 }],
    };
    const pushup = generateWorkout({ ...intermediate, logs }, ['push'], 'short', now).main.find((m) => m.exercise.id === 'pushup');
    expect(pushup?.plan).toMatchObject({ kind: 'progress', sets: 3, value: 13 });
    expect(pushup?.plan.headline).toBe('Beat your best: 3 × 13 reps');
  });

  it('never lets maintenance push the path to your goals aside', () => {
    const state: ProgressState = { ...intermediate, goals: ['bar-muscle-up'] };
    const w = generateWorkout(state, ['pull'], 'short', now);
    expect(w.main[0].exercise.id).toBe('chest-to-bar-pullup');
    expect(w.main[1].why).toBe('Mastered: keep it sharp');
  });

  it('leaves weighted exercises out until you have logged one, then plans them in your units', () => {
    const ids = (s: ProgressState) => generateWorkout(s, ['push', 'pull'], 'standard', now).main.map((m) => m.exercise.id);
    expect(ids(intermediate).some((id) => id.startsWith('weighted-'))).toBe(false);

    const lifting: ProgressState = {
      ...intermediate,
      units: 'lb',
      logs: { 'weighted-pullup': [{ id: 'w', date: daysAgo(2), sets: 3, value: 5, addedKg: 4.536, planned: { sets: 3, value: 5, addedKg: 4.536 } }] },
    };
    const w = generateWorkout(lifting, ['push', 'pull'], 'standard', now).main.find((m) => m.exercise.id === 'weighted-pullup');
    expect(w?.plan).toMatchObject({ kind: 'progress', sets: 3, value: 5 });
    expect(w?.plan.addedKg).toBeCloseTo(6.804, 2); // 15 lb, up from 10 lb
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
