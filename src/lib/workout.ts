import { exerciseById, exercises, tracks, treeById, trees, type Equipment, type Exercise, type TreeId } from '../data';
import { drills, type Drill } from '../data/drills';
import { splits, type Split } from '../data/splits';
import type { ProgressState } from '../state/progress';
import { accessTo, alternativesTo } from './equipment';
import { ancestorsOf, statusOf } from './graph';
import { planSession, restSeconds, type SessionPlan } from './progression';

export type WorkoutLength = 'short' | 'standard' | 'long';

/**
 * Main exercises: `perArea` for every chosen area up to `max` in all, but never fewer than MIN_PER_AREA per area
 * (so every area gets real work, and more areas make a longer workout) or `main` in all (so a single area
 * still gets a full session).
 */
export const LENGTHS: Record<
  WorkoutLength,
  { label: string; perArea: number; max: number; main: number; warmup: number; cooldown: number }
> = {
  short: { label: 'Short', perArea: 2, max: 6, main: 3, warmup: 4, cooldown: 3 },
  standard: { label: 'Standard', perArea: 3, max: 12, main: 5, warmup: 6, cooldown: 4 },
  long: { label: 'Long', perArea: 4, max: 16, main: 7, warmup: 7, cooldown: 5 },
};

export const MIN_PER_AREA = 2;

/** How far ahead (unmastered steps before it) a locked step can be to fill an area that's short of exercises. */
const NEXT_UP_GAP = 2;

/** How many main exercises a workout of this length has for this many areas. */
export function mainCount(length: WorkoutLength, areas: number): number {
  const cfg = LENGTHS[length];
  return Math.max(cfg.main, areas * MIN_PER_AREA, Math.min(areas * cfg.perArea, cfg.max));
}

/** A mastered exercise comes back for a maintenance session once you haven't done it for this many days… */
export const MAINTAIN_AFTER_DAYS = 7;
/** …and an area gets at most one maintenance session in this many days, so it doesn't crowd out progress. */
const MAINTAIN_GAP_DAYS = 3;

export type Block = 'skill' | 'strength' | 'core' | 'therapy';

export const BLOCKS: Record<Block, { label: string; note: string }> = {
  skill: { label: 'Skill work', note: 'Balance and static holds go first, while you are fresh.' },
  strength: { label: 'Strength', note: 'Alternate between exercises if you are training more than one area.' },
  core: { label: 'Core', note: 'Finish strong. Core work comes last so it does not tire you out for everything else.' },
  therapy: {
    label: 'Physical therapy & mobility',
    note: 'Slow and controlled, in a pain-free range. A mild stretch is fine; sharp or spreading pain is not.',
  },
};

const BLOCK_OF: Record<TreeId, Block> = {
  handstand: 'skill',
  planche: 'skill',
  levers: 'skill',
  'muscle-up': 'skill',
  breakdance: 'skill',
  push: 'strength',
  pull: 'strength',
  legs: 'strength',
  core: 'core',
  shoulder: 'therapy',
  'lower-back': 'therapy',
  hips: 'therapy',
  mobility: 'therapy',
};

const BLOCK_ORDER: Block[] = ['skill', 'strength', 'core', 'therapy'];

export interface WorkoutExercise {
  exercise: Exercise;
  plan: SessionPlan;
  block: Block;
  /** Why this exercise is in today's workout. */
  why: string;
  /** The focus tree that asked for it (can differ from the exercise's own tree when building toward a locked tree). */
  focus: TreeId;
  /** How to set up without the usual equipment, e.g. "Use two sturdy chairs as dip bars." */
  setup?: string;
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

export const sameFocus = (a: TreeId[], b: TreeId[]) => a.length === b.length && a.every((t) => b.includes(t));

/** "Push + Pull" (a named training day), or the trees joined: "Push + Handstand". */
export function focusTitle(focus: TreeId[]): string {
  const split = splits.find((s) => sameFocus(s.focus, focus));
  return split ? split.name : focus.map((t) => treeById[t].name).join(' + ');
}

export function exerciseSeconds(ex: Exercise, sets: number, value: number): number {
  const work = (ex.target.unit === 'seconds' ? value : value * 3) * (ex.target.perSide ? 2 : 1);
  return sets * work + (sets - 1) * restSeconds(ex) + 60; // + set-up / moving between exercises
}

interface Candidate {
  exercise: Exercise;
  why: string;
  score: number;
  setup?: string;
}

/**
 * Fits a tree's candidates to your equipment: exercises you can do with a stand-in get a setup note, and ones
 * you can't do at all are swapped for the closest alternative you can do (each exercise appears once).
 */
function fitEquipment(list: Candidate[], have: Equipment[] | null): Candidate[] {
  const out: Candidate[] = [];
  const has = (id: string) => out.some((c) => c.exercise.id === id) || list.some((c) => c.exercise.id === id && accessTo(c.exercise, have).kind !== 'missing');
  for (const c of list) {
    const access = accessTo(c.exercise, have);
    if (access.kind === 'ready') out.push(c);
    else if (access.kind === 'substitute') out.push({ ...c, setup: access.note });
    else {
      const alt = alternativesTo(c.exercise, have, 5).find((a) => !has(a.id));
      if (!alt) continue;
      const altAccess = accessTo(alt, have);
      out.push({
        exercise: alt,
        why: `Instead of ${c.exercise.name}`,
        score: c.score - 1,
        ...(altAccess.kind === 'substitute' && { setup: altAccess.note }),
      });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Tracks that start a progression of their own, rather than branching off another track in the same tree. */
const mainTracks = new Set(
  tracks.filter((t) => t.steps[0].requires.every((r) => exerciseById[r].tree !== t.tree)).map((t) => t.key),
);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysSince = (date: string, now: Date) => Math.round((startOfDay(now) - startOfDay(new Date(date))) / 86_400_000);

interface Kept {
  candidate: Candidate;
  /** Not done for MAINTAIN_AFTER_DAYS or more, and the area hasn't had a maintenance session lately. */
  due: boolean;
}

/**
 * Mastered skills to keep sharp: the hardest mastered step of each of the tree's tracks (easier ones are covered
 * by it). Stalest first, then finished tracks (nothing else trains them), then the harder skill.
 */
function maintenanceFor(tree: TreeId, state: ProgressState, now: Date): Kept[] {
  const { mastered, logs } = state;
  const have = state.equipment?.have ?? null;
  // Logged an already-mastered exercise in this tree in the last few days?
  const maintainedLately = exercises.some(
    (e) =>
      e.tree === tree &&
      mastered[e.id] &&
      logs[e.id]?.some((l) => Date.parse(l.date) > Date.parse(mastered[e.id]) && daysSince(l.date, now) < MAINTAIN_GAP_DAYS),
  );
  const kept: (Kept & { days: number; finished: boolean })[] = [];
  for (const track of tracks) {
    if (track.tree !== tree) continue;
    const i = track.steps.findLastIndex((s) => mastered[s.id]);
    if (i < 0) continue;
    const ex = track.steps[i];
    if (ex.target.addedKg !== undefined && !logs[ex.id]?.length) continue;
    const access = accessTo(ex, have);
    if (access.kind === 'missing') continue;
    const lastDone = [mastered[ex.id], ...(logs[ex.id] ?? []).map((l) => l.date)].reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
    const days = daysSince(lastDone, now);
    kept.push({
      candidate: { exercise: ex, why: 'Mastered: keep it sharp', score: 0, ...(access.kind === 'substitute' && { setup: access.note }) },
      due: days >= MAINTAIN_AFTER_DAYS && !maintainedLately,
      days,
      finished: i === track.steps.length - 1,
    });
  }
  kept.sort((a, b) => b.days - a.days || Number(b.finished) - Number(a.finished) || b.candidate.exercise.level - a.candidate.exercise.level);
  return kept.map(({ candidate, due }) => ({ candidate, due }));
}

/**
 * Adds maintenance to a tree's list: one mastered skill that's due goes right after the goal path (or the first
 * current step), so it comes back about once a week. One from a different progression is preferred; one from
 * the same progression goes a place later, since it adds less variety. The rest fill in when there's nothing
 * else left to train.
 */
function withMaintenance(list: Candidate[], kept: Kept[], goalOf: Map<string, string>): Candidate[] {
  const ids = new Set(list.map((c) => c.exercise.id));
  const rest = kept.filter((k) => !ids.has(k.candidate.exercise.id));
  const at = Math.max(1, list.filter((c) => goalOf.has(c.exercise.id)).length);
  const sameTrack = (k: Kept) => list.slice(0, at).some((c) => c.exercise.track === k.candidate.exercise.track);
  const due = rest.find((k) => k.due && !sameTrack(k)) ?? rest.find((k) => k.due);
  const after = rest.filter((k) => k !== due).map((k) => k.candidate);
  if (!due) return [...list, ...after];
  const pos = sameTrack(due) ? at + 1 : at;
  return [...list.slice(0, pos), due.candidate, ...list.slice(pos), ...after];
}

function candidatesFor(
  tree: TreeId,
  focus: TreeId[],
  state: ProgressState,
  goalOf: Map<string, string>,
  now: Date,
): { list: Candidate[]; note?: string } {
  const { mastered, logs } = state;
  const have = state.equipment?.have ?? null;
  // Weighted exercises need equipment, so they only join workouts once you've logged one (or made it a goal).
  const needsWeights = (e: Exercise) => e.target.addedKg !== undefined && !logs[e.id]?.length && !goalOf.has(e.id);
  // Main progressions (push-ups, dips, squats, hinges…) come before variations of them, so every area covers its
  // basic movements first.
  const score = (e: Exercise) =>
    (goalOf.has(e.id) ? 100 : 0) +
    (logs[e.id]?.length ? 20 : 0) +
    (mainTracks.has(e.track) ? 15 : 0) +
    e.level * 2 -
    (needsWeights(e) ? 50 : 0);
  const why = (e: Exercise) => {
    const goal = goalOf.get(e.id);
    if (goal) return goal === e.id ? 'Your goal' : `Toward ${exerciseById[goal].name}`;
    if (logs[e.id]?.length) return 'In progress';
    return `Your current step in ${e.trackName}`;
  };
  const inTree = exercises.filter((e) => e.tree === tree);
  const kept = maintenanceFor(tree, state, now);

  // The steps (often in other trees) that lead into this tree's locked skills. Steps from another chosen area
  // are left to that area, so they don't crowd out its own exercises.
  const locked = inTree.filter((e) => statusOf(e.id, mastered) === 'locked');
  const leadsIn = new Map<string, number>();
  for (const e of locked) {
    for (const a of ancestorsOf(e.id)) {
      if (statusOf(a, mastered) !== 'available' || focus.includes(exerciseById[a].tree)) continue;
      leadsIn.set(a, (leadsIn.get(a) ?? 0) + 1);
    }
  }
  const leadIns = fitEquipment(
    [...leadsIn].map(([id, count]) => {
      const e = exerciseById[id];
      return { exercise: e, why: `Builds toward ${treeById[tree].name}`, score: count * 10 + score(e) };
    }),
    have,
  );
  // Last resort for an area with too little unlocked to fill its share (say Handstand on a day you also train
  // Core and Push, which take its lead-ins): steps a little ahead, the tree's own first, then ones leading into
  // it. Locks are soft, and a new exercise starts at an easy prescription.
  const ahead = new Set(locked.map((e) => e.id));
  for (const e of locked) for (const a of ancestorsOf(e.id)) if (statusOf(a, mastered) === 'locked') ahead.add(a);
  const nextUp = fitEquipment(
    [...ahead]
      .map((id) => exerciseById[id])
      .filter((e) => e.target.addedKg === undefined)
      .map((e) => ({ exercise: e, gap: [...ancestorsOf(e.id)].filter((a) => !mastered[a]).length }))
      .filter(({ gap }) => gap <= NEXT_UP_GAP)
      .map(({ exercise: e, gap }) => ({
        exercise: e,
        why: e.tree === tree ? `A step ahead in ${e.trackName}` : `A step ahead, toward ${treeById[tree].name}`,
        score: (e.tree === tree ? 50 : 0) - gap * 10 - e.level,
      })),
    have,
  );

  // Normal case: the unlocked, not-yet-mastered steps (one per track), which are exactly your current level,
  // topped up with steps that lead into the rest of the tree when there are only a few.
  const available = inTree.filter((e) => statusOf(e.id, mastered) === 'available');
  if (available.length) {
    const list = fitEquipment(available.map((e) => ({ exercise: e, why: why(e), score: score(e) })), have);
    return { list: withMaintenance([...list, ...leadIns, ...nextUp], kept, goalOf) };
  }

  // Nothing unlocked yet: train the steps that lead into this tree.
  if (locked.length) {
    return {
      list: withMaintenance([...leadIns, ...nextUp], kept, goalOf),
      note: `${treeById[tree].name} isn't unlocked yet, so this workout trains the steps that lead into it.`,
    };
  }

  // Everything mastered: keep the skills sharp, and keep beating your best.
  return {
    list: kept.map((k) => k.candidate),
    note: `You've mastered every ${treeById[tree].name} skill, so this includes maintenance sets.`,
  };
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
    const { list, note } = candidatesFor(t, focus, state, goalOf, now);
    pools.set(t, list);
    if (note) notes.push(note);
  }

  // Every area gets its share of the exercises. Trees with a goal on them get any spare slots first.
  const total = mainCount(length, focus.length);
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
      plan: planSession(ex, state.logs[ex.id], { mastered: !!state.mastered[ex.id], now, units: state.units }),
      block: BLOCK_OF[ex.tree],
      why: candidate.why,
      focus: t,
      ...(candidate.setup && { setup: candidate.setup }),
    };
  });
  if (main.some((m) => m.why.startsWith('Instead of'))) {
    notes.push('Some exercises were swapped for ones your equipment allows. Update your equipment any time on the Equipment page.');
  }
  // Skills first, then strength (kept interleaved across trees), then core, then physical therapy and mobility.
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

/** Estimated minutes of a workout of each length for these areas, for the length pickers. */
export function minutesByLength(state: ProgressState, focus: TreeId[], now = new Date()): Record<WorkoutLength, number> {
  const lengths = Object.keys(LENGTHS) as WorkoutLength[];
  return Object.fromEntries(lengths.map((l) => [l, generateWorkout(state, focus, l, now).minutes])) as Record<WorkoutLength, number>;
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
    if (split.restDay || !split.focus.every((t) => isUnlocked(t, state))) continue;
    const days = split.focus.map((t) => daysSinceTrained(t, state, now));
    // Never-trained trees count as moderately rested, so new skill trees don't crowd out your regular rotation.
    const fresh = days.map((d) => (d === Infinity ? NEVER_TRAINED_DAYS : Math.min(d, 7)));
    if (fresh.some((d) => d <= 1)) continue; // trained today or yesterday: let it recover
    const score = fresh.reduce((a, b) => a + b, 0) / fresh.length + (split.focus.some((t) => goalTrees.has(t)) ? 1.5 : 0);
    if (!best || score > best.score) best = { split, score, days };
  }
  if (!best) {
    return {
      split: splits.find((s) => s.restDay)!,
      reason: 'Most areas were trained in the last day or two. Make it a recovery day: shoulders, back, hips and mobility.',
    };
  }
  const parts = best.split.focus.map((t, i) => {
    const d = best!.days[i];
    const name = treeById[t].name;
    return d === Infinity ? `${name} not yet` : `${name} ${d} days ago`;
  });
  return { split: best.split, reason: `Most rested right now. Last trained: ${parts.join(', ')}.` };
}
