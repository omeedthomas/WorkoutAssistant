import { breakdance } from './trees/breakdance';
import { core } from './trees/core';
import { handstand } from './trees/handstand';
import { hips } from './trees/hips';
import { legs } from './trees/legs';
import { levers } from './trees/levers';
import { lowerBack } from './trees/lowerBack';
import { mobility } from './trees/mobility';
import { muscleUp } from './trees/muscleUp';
import { planche } from './trees/planche';
import { pull } from './trees/pull';
import { push } from './trees/push';
import { shoulder } from './trees/shoulder';
import type { Exercise, Track, TreeDef, TreeId } from './types';

export type { Equipment, Exercise, Target, Track, TreeDef, TreeId, Unit } from './types';

/** Display order of the trees. */
export const trees: TreeDef[] = [push, pull, core, legs, handstand, planche, levers, muscleUp, breakdance, shoulder, lowerBack, hips, mobility];

export const treeById = Object.fromEntries(trees.map((t) => [t.id, t])) as Record<TreeId, TreeDef>;

/** Flattens tree definitions into exercises with fully resolved prerequisites. */
export function buildCatalog(defs: TreeDef[]): { exercises: Exercise[]; tracks: Track[] } {
  const exercises: Exercise[] = [];
  const tracks: Track[] = [];
  for (const tree of defs) {
    for (const trackDef of tree.tracks) {
      const key = `${tree.id}/${trackDef.id}`;
      const steps: Exercise[] = trackDef.steps.map((step, i) => {
        const { requires: extra = [], ...rest } = step;
        const implicit = i === 0 ? (trackDef.from ?? []) : [trackDef.steps[i - 1].id];
        return {
          ...rest,
          tree: tree.id,
          track: key,
          trackName: trackDef.name,
          step: i,
          requires: [...new Set([...implicit, ...extra])],
        };
      });
      exercises.push(...steps);
      tracks.push({ key, tree: tree.id, name: trackDef.name, steps });
    }
  }
  return { exercises, tracks };
}

const catalog = buildCatalog(trees);

export const exercises: Exercise[] = catalog.exercises;
export const tracks: Track[] = catalog.tracks;

export const exerciseById: Record<string, Exercise> = Object.fromEntries(
  exercises.map((e) => [e.id, e]),
);

export const trackByKey: Record<string, Track> = Object.fromEntries(tracks.map((t) => [t.key, t]));

/** Direct dependents: exercises that list `id` as a prerequisite. */
export const dependentsOf: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = Object.fromEntries(exercises.map((e) => [e.id, []]));
  for (const e of exercises) for (const r of e.requires) map[r]?.push(e.id);
  return map;
})();

export function tierOf(level: number): string {
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  if (level <= 8) return 'Advanced';
  return 'Elite';
}

/** Skills worth suggesting as long-term goals. */
export const featuredGoals = [
  'pullup',
  'pushup',
  'pistol-squat',
  'l-sit',
  'freestanding-handstand',
  'bar-muscle-up',
  'full-front-lever',
  'straddle-planche',
  'human-flag',
  'one-arm-pushup',
];
