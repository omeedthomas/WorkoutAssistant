import { describe, expect, it } from 'vitest';
import { exerciseById, exercises, featuredGoals, tracks, trees } from '.';
import { treeImages } from './treeImages';
import { videos } from './videos';

describe('skill catalog', () => {
  it('has unique exercise ids', () => {
    const ids = exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only references prerequisites that exist', () => {
    const missing = exercises.flatMap((e) =>
      e.requires.filter((r) => !exerciseById[r]).map((r) => `${e.id} → ${r}`),
    );
    expect(missing).toEqual([]);
  });

  it('has no prerequisite cycles', () => {
    const state = new Map<string, 'visiting' | 'done'>();
    const visit = (id: string, path: string[]) => {
      if (state.get(id) === 'done') return;
      if (state.get(id) === 'visiting') throw new Error(`Cycle: ${[...path, id].join(' → ')}`);
      state.set(id, 'visiting');
      for (const r of exerciseById[id].requires) visit(r, [...path, id]);
      state.set(id, 'done');
    };
    for (const e of exercises) expect(() => visit(e.id, [])).not.toThrow();
  });

  it('never makes a prerequisite harder than what it unlocks', () => {
    const inverted = exercises.flatMap((e) =>
      e.requires
        .filter((r) => exerciseById[r].level > e.level)
        .map((r) => `${r} (L${exerciseById[r].level}) → ${e.id} (L${e.level})`),
    );
    expect(inverted).toEqual([]);
  });

  it('uses sane levels and targets', () => {
    for (const e of exercises) {
      expect(e.level, e.id).toBeGreaterThanOrEqual(1);
      expect(e.level, e.id).toBeLessThanOrEqual(10);
      expect(e.target.sets, e.id).toBeGreaterThan(0);
      expect(e.target.value, e.id).toBeGreaterThan(0);
      expect(e.cues.length, e.id).toBeGreaterThan(0);
      expect(e.description.length, e.id).toBeGreaterThan(10);
    }
  });

  it('chains every step of a track to the previous one', () => {
    for (const t of tracks) {
      t.steps.forEach((step, i) => {
        if (i > 0) expect(step.requires, step.id).toContain(t.steps[i - 1].id);
      });
    }
  });

  it('gives every tree at least one exercise and lists tracks per tree', () => {
    for (const tree of trees) {
      expect(exercises.some((e) => e.tree === tree.id), tree.id).toBe(true);
      expect(tracks.some((t) => t.tree === tree.id), tree.id).toBe(true);
    }
  });

  it('offers a beginner entry point (a step with no prerequisites) in the base trees', () => {
    for (const tree of ['push', 'pull', 'core', 'legs']) {
      expect(exercises.some((e) => e.tree === tree && e.requires.length === 0), tree).toBe(true);
    }
  });

  it('gives every tree an ultimate skill from its own tree, near the top of it', () => {
    for (const tree of trees) {
      const peak = exerciseById[tree.ultimate];
      expect(peak, tree.id).toBeDefined();
      expect(peak.tree, tree.id).toBe(tree.id);
      const top = Math.max(...exercises.filter((e) => e.tree === tree.id && !e.target.addedKg).map((e) => e.level));
      expect(peak.level, tree.id).toBeGreaterThanOrEqual(top - 2);
    }
  });

  it('has a Home card photo for every tree', () => {
    for (const tree of trees) expect(treeImages[tree.id], tree.id).toMatch(/\.webp/);
  });

  it('only features goals that exist', () => {
    for (const g of featuredGoals) expect(exerciseById[g], g).toBeDefined();
  });

  it('has a how-to video for every exercise, and none for unknown ones', () => {
    expect(exercises.filter((e) => !videos[e.id]).map((e) => e.id)).toEqual([]);
    expect(Object.keys(videos).filter((id) => !exerciseById[id])).toEqual([]);
    for (const [id, v] of Object.entries(videos)) {
      expect(v.youtubeId, id).toMatch(/^[\w-]{11}$/);
      expect(v.title.trim(), id).not.toBe('');
      expect(v.channel.trim(), id).not.toBe('');
    }
  });
});
