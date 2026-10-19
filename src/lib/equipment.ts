import { exerciseById, exercises, trackByKey, type Equipment, type Exercise } from '../data';
import { equipmentById } from '../data/equipment';

/** Whether you can do an exercise with the equipment you have. */
export type Access =
  | { kind: 'ready' }
  | { kind: 'substitute'; note: string }
  | { kind: 'missing'; needs: Equipment[] };

/**
 * `have` is null until you've said what equipment you have; until then
 * everything counts as possible, so nothing gets hidden.
 */
export function accessTo(ex: Exercise, have: Equipment[] | null): Access {
  const needs = ex.equipment;
  if (!needs?.length || !have || needs.some((e) => have.includes(e))) return { kind: 'ready' };
  for (const need of needs) {
    for (const s of equipmentById[need].substitutes ?? []) {
      if (s.with === 'household' || have.includes(s.with)) return { kind: 'substitute', note: s.note };
    }
  }
  return { kind: 'missing', needs };
}

export const canDo = (ex: Exercise, have: Equipment[] | null) => accessTo(ex, have).kind !== 'missing';

/** "a pull-up bar or gymnastic rings" */
export function describeNeeds(needs: Equipment[]): string {
  // Lower-case the first word, but keep names like "BOSU ball" as they are.
  const names = needs.map((e) => equipmentById[e].name.replace(/^[A-Z][a-z]/, (c) => c.toLowerCase()));
  const a = (n: string) => (/^[aeiou]/.test(n) ? `an ${n}` : /s$/.test(n) ? n : `a ${n}`);
  return names.length === 1 ? a(names[0]) : `${names.slice(0, -1).map(a).join(', ')} or ${a(names[names.length - 1])}`;
}

/**
 * Exercises you can do instead of `ex` with your equipment: the hand-picked
 * ones first, then the nearest steps of the same progression, then others in
 * the same area at a similar level.
 */
export function alternativesTo(ex: Exercise, have: Equipment[] | null, limit = 3): Exercise[] {
  const picked = (ex.alternatives ?? []).map((id) => exerciseById[id]).filter(Boolean);
  const steps = [...(trackByKey[ex.track]?.steps ?? [])].sort(
    (a, b) => Math.abs(a.step - ex.step) - Math.abs(b.step - ex.step) || a.step - b.step,
  );
  const area = exercises
    .filter((e) => e.tree === ex.tree && Math.abs(e.level - ex.level) <= 1)
    .sort((a, b) => Math.abs(a.level - ex.level) - Math.abs(b.level - ex.level) || a.level - b.level);
  const out: Exercise[] = [];
  for (const e of [...picked, ...steps, ...area]) {
    if (e.id !== ex.id && !out.includes(e) && canDo(e, have)) out.push(e);
  }
  return out.slice(0, limit);
}
