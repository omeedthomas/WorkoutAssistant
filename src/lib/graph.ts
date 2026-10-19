import { dependentsOf, exerciseById, exercises, type Exercise, type TreeId } from '../data';
import type { LogEntry } from '../state/progress';

export type Status = 'mastered' | 'available' | 'locked';
export type MasteredMap = Record<string, string>;

export function statusOf(id: string, mastered: MasteredMap): Status {
  if (mastered[id]) return 'mastered';
  const ex = exerciseById[id];
  return ex.requires.every((r) => mastered[r]) ? 'available' : 'locked';
}

const ancestorCache = new Map<string, Set<string>>();

/** Every exercise that must be mastered before `id` (transitively). */
export function ancestorsOf(id: string): Set<string> {
  const cached = ancestorCache.get(id);
  if (cached) return cached;
  const result = new Set<string>();
  const stack = [...exerciseById[id].requires];
  while (stack.length) {
    const next = stack.pop()!;
    if (result.has(next)) continue;
    result.add(next);
    stack.push(...exerciseById[next].requires);
  }
  ancestorCache.set(id, result);
  return result;
}

/** Ancestors of `id` that aren't mastered yet. */
export function missingAncestors(id: string, mastered: MasteredMap): string[] {
  return [...ancestorsOf(id)].filter((a) => !mastered[a]);
}

/** `ids` plus all of their ancestors. */
export function withAncestors(ids: Iterable<string>): string[] {
  const all = new Set<string>();
  for (const id of ids) {
    all.add(id);
    for (const a of ancestorsOf(id)) all.add(a);
  }
  return [...all];
}

/** Every exercise on the way to any of the goals (including the goals). */
export function goalPathSet(goals: string[]): Set<string> {
  return new Set(withAncestors(goals));
}

export function goalProgress(goal: string, mastered: MasteredMap): { done: number; total: number } {
  const path = [...ancestorsOf(goal), goal];
  return { done: path.filter((id) => mastered[id]).length, total: path.length };
}

/** The exercises you can train right now that move you toward `goal`. */
export function nextStepsToward(goal: string, mastered: MasteredMap): Exercise[] {
  return [...ancestorsOf(goal), goal]
    .filter((id) => statusOf(id, mastered) === 'available')
    .map((id) => exerciseById[id])
    .sort((a, b) => a.level - b.level || a.step - b.step);
}

/** Exercises that change from locked to available going from `before` to `after`. */
export function newlyUnlocked(before: MasteredMap, after: MasteredMap): Exercise[] {
  const candidates = new Set<string>();
  for (const id of Object.keys(after)) {
    if (!before[id]) for (const d of dependentsOf[id] ?? []) candidates.add(d);
  }
  return [...candidates]
    .filter((id) => statusOf(id, before) === 'locked' && statusOf(id, after) === 'available')
    .map((id) => exerciseById[id]);
}

export function treeStats(tree: TreeId, mastered: MasteredMap) {
  const list = exercises.filter((e) => e.tree === tree);
  let done = 0;
  let available = 0;
  for (const e of list) {
    const s = statusOf(e.id, mastered);
    if (s === 'mastered') done++;
    else if (s === 'available') available++;
  }
  return { done, available, total: list.length };
}

type Done = Pick<LogEntry, 'sets' | 'value' | 'addedKg'>;

/** 0–1 score for one logged session against the mastery target. */
export function logScore(ex: Exercise, log: Done): number {
  const { sets, value, addedKg } = ex.target;
  const load = addedKg ? Math.min(1, (log.addedKg ?? 0) / addedKg) : 1;
  return Math.min(1, log.value / value) * Math.min(1, log.sets / sets) * load;
}

export function meetsTarget(ex: Exercise, log: Done): boolean {
  const { sets, value, addedKg } = ex.target;
  // Weights are entered in lb or kg, so allow for rounding against a target stored in kg.
  const loaded = addedKg === undefined || (log.addedKg ?? 0) >= addedKg - 0.01;
  return log.sets >= sets && log.value >= value && loaded;
}

export function bestLog(ex: Exercise, logs: LogEntry[] | undefined): LogEntry | undefined {
  let best: LogEntry | undefined;
  for (const l of logs ?? []) if (!best || logScore(ex, l) > logScore(ex, best)) best = l;
  return best;
}
