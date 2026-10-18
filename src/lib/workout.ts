import { exerciseById, exercises, treeById, trees, type Exercise, type TreeId } from '../data';
import { drills, type Drill } from '../data/drills';
import { splits, type Split } from '../data/splits';
import type { ProgressState } from '../state/progress';
import { ancestorsOf, statusOf } from './graph';
import { planSession, type SessionPlan } from './progression';

export type WorkoutLength = 'short' | 'standard' | 'long';

export const LENGTHS: Record<WorkoutLength, { label: string; minutes: string; main: number; warmup: number; cooldown: number }> = {
  short: { label: 'Short', minutes: '~30 min', main: 3, warmup: 4, cooldown: 3 },
  standard: { label: 'Standard', minutes: '~45 min', main: 5, warmup: 6, cooldown: 4 },
  long: { label: 'Long', minutes: '~60 min', main: 7, warmup: 7, cooldown: 5 },
};

export type Block = 'skill' | 'strength' | 'core';

export const BLOCKS: Record<Block, { label: string; note: string }> = {
  skill: { label: 'Skill work', note: 'Balance and static holds go first, while you are fresh.' },
  strength: { label: 'Strength', note: 'Alternate between exercises if you are training more than one area.' },
  core: { label: 'Core', note: 'Finish strong. Core work comes last so it does not tire you out for everything else.' },
};

const BLOCK_OF: Record<TreeId, Block> = {
  handstand: 'skill',
  planche: 'skill',
  levers: 'skill',
  'muscle-up': 'skill',
  push: 'strength',
  pull: 'strength',
  legs: 'strength',
  core: 'core',
};

const BLOCK_ORDER: Block[] = ['skill', 'strength', 'core'];

export interface WorkoutExercise {
  exercise: Exercise;
  plan: SessionPlan;
  block: Block;
  /** Why this exercise is in today's workout. */
  why: string;
  /** The focus tree that asked for it (can differ from the exercise's own tree when building toward a locked tree). */
  focus: TreeId;
}

export interface Workout {
  focus: TreeId[];
  length: WorkoutLength;
  warmup: Drill[];
  main: WorkoutExercise[];
  cooldown: Drill[];
  minutes: number;
  notes: string[];
}

/** Canonical order, so the same selection always gives the same workout. */
export function sortFocus(focus: TreeId[]): TreeId[] {
  const order = trees.map((t) => t.id);
  return [...new Set(focus)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function restSeconds(ex: Exercise): number {
  if (ex.level <= 2) return 75;
  if (ex.level <= 5) return 105;
  return 150;
}

export function exerciseSeconds(ex: Exercise, sets: number, value: number): number {
  const work = (ex.target.unit === 'seconds' ? value : value * 3) * (ex.target.perSide ? 2 : 1);
  return sets * work + (sets - 1) * restSeconds(ex) + 60; // + set-up / moving between exercises
}

interface Candidate {
  exercise: Exercise;
  why: string;
  score: number;
}

function candidatesFor(tree: TreeId, state: ProgressState, goalOf: Map<string, string>): { list: Candidate[]; note?: string } {
  const { mastered, logs } = state;
  const score = (e: Exercise) => (goalOf.has(e.id) ? 100 : 0) + (logs[e.id]?.length ? 20 : 0) + e.level * 2;
  const why = (e: Exercise) => {
    const goal = goalOf.get(e.id);
    if (goal) return goal === e.id ? 'Your goal' : `Toward ${exerciseById[goal].name}`;
    if (logs[e.id]?.length) return 'In progress';
    return `Your current step in ${e.trackName}`;
  };
  const inTree = exercises.filter((e) => e.tree === tree);

  // Normal case: the unlocked, not-yet-mastered steps, which are exactly your current level.
  const available = inTree.filter((e) => statusOf(e.id, mastered) === 'available');
  if (available.length) {
    return { list: available.map((e) => ({ exercise: e, why: why(e), score: score(e) })).sort((a, b) => b.score - a.score) };
  }

  // Nothing unlocked yet: train the steps (often in other trees) that lead into this tree.
  const locked = inTree.filter((e) => statusOf(e.id, mastered) === 'locked');
  if (locked.length) {
    const leadsIn = new Map<string, number>();
    for (const e of locked) {
      for (const a of ancestorsOf(e.id)) {
        if (statusOf(a, mastered) === 'available') leadsIn.set(a, (leadsIn.get(a) ?? 0) + 1);
      }
    }
    const list = [...leadsIn]
      .map(([id, count]) => {
        const e = exerciseById[id];
        return { exercise: e, why: `Builds toward ${treeById[tree].name}`, score: count * 10 + score(e) };
      })
      .sort((a, b) => b.score - a.score);
    return {
      list,
      note: `${treeById[tree].name} isn't unlocked yet, so this workout trains the steps that lead into it.`,
    };
  }

  // Everything mastered: maintain the hardest skills.
  const list = [...inTree]
    .sort((a, b) => b.level - a.level)
    .map((e) => ({ exercise: e, why: 'Maintenance', score: e.level }));
  return { list, note: `You've mastered every ${treeById[tree].name} skill, so this includes maintenance sets.` };
}

function pickDrills(phase: Drill['phase'], focus: TreeId[], count: number): Drill[] {
  const pool = drills.filter((d) => d.phase === phase);
  const relevant = (d: Drill, t: TreeId) => d.focus !== 'all' && d.focus.includes(t);
  const picked: Drill[] = [];
  const add = (d: Drill | undefined) => d && !picked.includes(d) && picked.push(d);

  if (phase === 'warmup') add(pool.find((d) => d.id === 'pulse'));
  const limit = phase === 'cooldown' ? count - 1 : count; // leave room for the closing breathing drill

  // Round-robin so every focus area gets its own prep, then fill with drills that serve several areas.
  let added = true;
  while (picked.length < limit && added) {
    added = false;
    for (const t of focus) {
      if (picked.length >= limit) break;
      const next = pool.find((d) => relevant(d, t) && !picked.includes(d));
      if (next) {
        picked.push(next);
        added = true;
      }
    }
  }
  for (const d of pool) {
    if (picked.length >= limit) break;
    if (d.focus === 'all' && d.id !== 'breathing') add(d);
  }
  if (phase === 'cooldown') add(pool.find((d) => d.id === 'breathing'));
  return picked;
}

/**
 * Builds a full session for the chosen focus trees: warm-up drills for those
 * areas, the exercises you're currently working on in each tree (with today's
 * sets from your history), and a matching cooldown.
 */
export function generateWorkout(
  state: ProgressState,
  focusInput: TreeId[],
  length: WorkoutLength = 'standard',
  now = new Date(),
): Workout {
  const focus = sortFocus(focusInput);
  const cfg = LENGTHS[length];
  const goalOf = new Map<string, string>();
  for (const g of state.goals) for (const id of [g, ...ancestorsOf(g)]) if (!goalOf.has(id)) goalOf.set(id, g);

  const notes: string[] = [];
  const pools = new Map<TreeId, Candidate[]>();
  for (const t of focus) {
    const { list, note } = candidatesFor(t, state, goalOf);
    pools.set(t, list);
    if (note) notes.push(note);
  }

  // Share the exercise budget across trees. Trees with a goal on them get any spare slots first.
  const total = Math.max(cfg.main, focus.length);
  const priority = [...focus].sort(
    (a, b) => Number((pools.get(b) ?? []).some((c) => goalOf.has(c.exercise.id))) - Number((pools.get(a) ?? []).some((c) => goalOf.has(c.exercise.id))),
  );
  const allot = new Map(focus.map((t) => [t, Math.floor(total / focus.length)]));
  for (let i = 0; i < total % focus.length; i++) allot.set(priority[i], allot.get(priority[i])! + 1);

  const chosen: { candidate: Candidate; focus: TreeId }[] = [];
  const taken = new Set<string>();
  const take = (t: TreeId) => {
    const c = pools.get(t)!.find((x) => !taken.has(x.exercise.id));
    if (!c) return false;
    taken.add(c.exercise.id);
    chosen.push({ candidate: c, focus: t });
    return true;
  };
  // Round-robin within each tree's allotment, then hand unused slots to trees with more to offer.
  for (let round = 0; chosen.length < total; round++) {
    let progressed = false;
    for (const t of focus) {
      if (round < allot.get(t)! && chosen.length < total && take(t)) progressed = true;
    }
    if (!progressed) break;
  }
  while (chosen.length < total) {
    let progressed = false;
    for (const t of priority) if (chosen.length < total && take(t)) progressed = true;
    if (!progressed) break;
  }

  const main: WorkoutExercise[] = chosen.map(({ candidate, focus: t }) => {
    const ex = candidate.exercise;
    return {
      exercise: ex,
      plan: planSession(ex, state.logs[ex.id], { mastered: !!state.mastered[ex.id], now }),
      block: BLOCK_OF[ex.tree],
      why: candidate.why,
      focus: t,
    };
  });
  // Skills first, then strength (kept interleaved across trees), then core.
  main.sort((a, b) => BLOCK_ORDER.indexOf(a.block) - BLOCK_ORDER.indexOf(b.block));

  const warmup = pickDrills('warmup', focus, cfg.warmup);
  const cooldown = pickDrills('cooldown', focus, cfg.cooldown);

  if (main[0]) {
    notes.unshift(
      `Before your first working set of ${main[0].exercise.name}, do one easy ramp-up set at about half the ${main[0].exercise.target.unit === 'seconds' ? 'hold time' : 'reps'}.`,
    );
  }

  const seconds =
    warmup.reduce((s, d) => s + d.seconds, 0) +
    main.reduce((s, m) => s + exerciseSeconds(m.exercise, m.plan.sets, m.plan.value), 0) +
    cooldown.reduce((s, d) => s + d.seconds, 0);

  return { focus, length, warmup, main, cooldown, minutes: Math.round(seconds / 60), notes };
}

// ---------- Suggested split for today ----------

export interface SplitSuggestion {
  split: Split;
  reason: string;
}

/** Days since you last logged anything in `tree` (Infinity if never). */
export function daysSinceTrained(tree: TreeId, state: ProgressState, now = new Date()): number {
  let latest = 0;
  for (const [id, list] of Object.entries(state.logs)) {
    if (exerciseById[id]?.tree !== tree) continue;
    for (const l of list) latest = Math.max(latest, Date.parse(l.date));
  }
  if (!latest) return Infinity;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(now) - startOfDay(new Date(latest))) / 86_400_000);
}

const NEVER_TRAINED_DAYS = 4;

const isUnlocked = (tree: TreeId, state: ProgressState) =>
  exercises.some((e) => e.tree === tree && statusOf(e.id, state.mastered) !== 'locked');

/**
 * Picks today's split: the most rested trees that you can actually train,
 * skipping anything trained yesterday, with a nudge toward your goals.
 */
export function suggestSplit(state: ProgressState, now = new Date()): SplitSuggestion {
  const anyLogs = Object.keys(state.logs).length > 0;
  if (!anyLogs) {
    return { split: splits.find((s) => s.id === 'full-body')!, reason: 'New here? A full-body day is the best place to start.' };
  }
  const goalTrees = new Set(state.goals.flatMap((g) => [g, ...ancestorsOf(g)].map((id) => exerciseById[id].tree)));

  let best: { split: Split; score: number; days: number[] } | null = null;
  for (const split of splits) {
    if (!split.focus.every((t) => isUnlocked(t, state))) continue;
    const days = split.focus.map((t) => daysSinceTrained(t, state, now));
    // Never-trained trees count as moderately rested, so new skill trees don't crowd out your regular rotation.
    const fresh = days.map((d) => (d === Infinity ? NEVER_TRAINED_DAYS : Math.min(d, 7)));
    if (fresh.some((d) => d <= 1)) continue; // trained today or yesterday: let it recover
    const score = fresh.reduce((a, b) => a + b, 0) / fresh.length + (split.focus.some((t) => goalTrees.has(t)) ? 1.5 : 0);
    if (!best || score > best.score) best = { split, score, days };
  }
  if (!best) {
    return {
      split: splits.find((s) => s.id === 'handstand-core')!,
      reason: 'Most areas were trained in the last day or two. Keep it light with balance and core work.',
    };
  }
  const parts = best.split.focus.map((t, i) => {
    const d = best!.days[i];
    const name = treeById[t].name;
    return d === Infinity ? `${name} not yet` : `${name} ${d} days ago`;
  });
  return { split: best.split, reason: `Most rested right now. Last trained: ${parts.join(', ')}.` };
}
