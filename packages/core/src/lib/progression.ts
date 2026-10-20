import { dependentsOf, exerciseById, trackByKey, treeById, type Exercise } from '../data';
import type { LogEntry, Work } from '../state/progress';
import { formatSet } from './format';
import { formatAdded, formatWeight, loadStepKg, snapLoad, type Units } from './units';

/**
 * Turns an exercise's logged history into a prescription for the next session
 * ("double progression"): first build up to the target number of sets, then
 * add reps (or seconds) each time you complete the plan, until you reach the
 * mastery target. Missed plans are repeated; repeated misses switch to an
 * extra-volume session to break the plateau. Weighted exercises progress by
 * load instead (see planWeighted).
 */

export type PlanKind =
  | 'start' // no history yet: a starting point
  | 'progress' // you completed the last plan: go up
  | 'add-set' // build up to the target number of sets first
  | 'repeat' // you missed the last plan: same goal again
  | 'reset' // missed the plan by a lot: restart from what you did
  | 'consolidate' // missed several times: extra set at the level below
  | 'return' // long break: ease back in
  | 'mastery' // you've hit the mastery target
  | 'maintain'; // already mastered

export interface SessionPlan {
  kind: PlanKind;
  sets: number;
  /** Reps (or seconds) per set. */
  value: number;
  /** Weighted exercises: added weight in kg. */
  addedKg?: number;
  headline: string;
  reason: string;
  tip?: string;
  rest: string;
  /** Successful sessions, starting with this one, until the mastery target at this pace. */
  sessionsToMastery: number;
}

type SetsValue = Work;

const DAY = 86_400_000;
export const RETURN_AFTER_DAYS = 14;
const PLATEAU_MISSES = 3;

/** Reps or seconds added per successful session: about 10% of the target, at least 1. */
export function stepFor(ex: Exercise): number {
  return Math.max(1, Math.round(ex.target.value / 10));
}

/** A first prescription at roughly half the mastery target. */
export function startValue(ex: Exercise): number {
  const half = ex.target.value / 2;
  if (ex.target.unit === 'seconds' && ex.target.value >= 20) return Math.max(5, Math.round(half / 5) * 5);
  return Math.max(1, Math.ceil(half));
}

/**
 * Rest between sets, in seconds. Physical therapy and easy steps only need a short breather; strength sets
 * worked close to your limit need a couple of minutes to recover.
 */
export function restSeconds(ex: Exercise): number {
  if (treeById[ex.tree].kind === 'therapy') return 30;
  if (ex.target.addedKg !== undefined || ex.level >= 6) return 150;
  if (ex.level <= 2) return 45;
  return 120;
}

export function restFor(ex: Exercise): string {
  const s = restSeconds(ex);
  if (s >= 150) return '2–3 min';
  return s >= 60 ? `${s / 60} min` : `${s} s`;
}

const added = (w: SetsValue) => w.addedKg ?? 0;
const meets = (done: SetsValue, goal: SetsValue) =>
  done.sets >= goal.sets && done.value >= goal.value && added(done) >= added(goal) - 0.01;
const same = (a: SetsValue, b: SetsValue) =>
  a.sets === b.sets && a.value === b.value && Math.abs(added(a) - added(b)) < 0.01;

export function sessionsToMastery(ex: Exercise, plan: SetsValue, units: Units = 'kg'): number {
  const { sets, value, addedKg } = ex.target;
  if (addedKg !== undefined) {
    const goal = snapLoad(addedKg, units, 'up');
    if (meets(plan, { sets, value, addedKg: goal })) return 1;
    return 1 + Math.max(0, sets - plan.sets) + Math.max(0, Math.ceil((goal - added(plan)) / loadStepKg(units) - 0.01));
  }
  if (meets(plan, ex.target)) return 1;
  return 1 + Math.max(0, sets - plan.sets) + Math.max(0, Math.ceil((value - plan.value) / stepFor(ex)));
}

function trackNeighbour(ex: Exercise, offset: 1 | -1): Exercise | undefined {
  const steps = trackByKey[ex.track]?.steps ?? [];
  const next = steps[ex.step + offset];
  if (next) return next;
  // End of a track: point at anything this exercise unlocks.
  return offset === 1 ? dependentsOf[ex.id].map((id) => exerciseById[id])[0] : undefined;
}

function unitWord(ex: Exercise, n: number): string {
  if (ex.target.unit === 'seconds') return n === 1 ? 'second' : 'seconds';
  return n === 1 ? 'rep' : 'reps';
}

interface PlanOptions {
  mastered?: boolean;
  now?: Date;
  /** Weighted exercises add weight in steps of 5 lb or 2.5 kg. */
  units?: Units;
}

export function planSession(
  ex: Exercise,
  logs: LogEntry[] = [],
  { mastered = false, now = new Date(), units = 'kg' }: PlanOptions = {},
): SessionPlan {
  if (ex.target.addedKg !== undefined) return planWeighted(ex, logs, { mastered, now, units });
  const target = ex.target;
  const step = stepFor(ex);
  const each = target.perSide ? ' each side' : '';
  const fmt = (p: SetsValue) => `${formatSet(p.sets, p.value, target.unit)}${each}`;
  const next = trackNeighbour(ex, 1);
  const last = logs[0];

  const make = (kind: PlanKind, plan: SetsValue, headline: string, reason: string, tip?: string): SessionPlan => ({
    kind,
    sets: plan.sets,
    value: plan.value,
    headline,
    reason,
    tip,
    rest: restFor(ex),
    sessionsToMastery: sessionsToMastery(ex, plan),
  });

  if (mastered) return planMastered(ex, logs, now, fmt, next);

  if (!last) {
    const start = { sets: target.sets, value: startValue(ex) };
    return make(
      'start',
      start,
      `Start with ${fmt(start)}`,
      `A starting point at about half the mastery target. If it feels easy, keep going and log what you actually did. The plan adjusts from your real numbers.`,
    );
  }

  if (meets(last, target)) {
    return make(
      'mastery',
      target,
      'Mastery target reached',
      `You did ${fmt(last)}, which meets the ${fmt(target)} target. Mark it mastered${next ? ` and start ${next.name}` : ''}.`,
    );
  }

  const daysAway = Math.floor((now.getTime() - Date.parse(last.date)) / DAY);
  if (daysAway >= RETURN_AFTER_DAYS) {
    const plan = { sets: Math.min(target.sets, last.sets), value: Math.max(1, last.value - step) };
    return make(
      'return',
      plan,
      `Ease back in: ${fmt(plan)}`,
      `It's been ${daysAway} days since your last session (${fmt(last)}). Start a little lighter and you'll be back to it within a session or two.`,
    );
  }

  // Missed the plan? (The very first session is a calibration, never a miss.)
  const planned = last.planned;
  if (planned && logs.length > 1 && !meets(last, planned)) {
    // Way short of the plan: recalibrate from what you actually did.
    if (last.value < planned.value - 2 * step) {
      const plan = { sets: Math.max(last.sets, Math.min(target.sets, planned.sets)), value: last.value + step };
      return make(
        'reset',
        plan,
        `Reset to ${fmt(plan)}`,
        `${fmt(last)} was well short of the planned ${fmt(planned)}, so the plan restarts from your real numbers.`,
      );
    }

    let misses = 0;
    for (const l of logs) {
      if (l.planned && same(l.planned, planned) && !meets(l, l.planned)) misses++;
      else break;
    }

    if (misses >= PLATEAU_MISSES) {
      const plan = {
        sets: Math.min(target.sets + 2, Math.max(planned.sets, target.sets) + 1),
        value: Math.max(1, planned.value - step),
      };
      const prev = trackNeighbour(ex, -1);
      return make(
        'consolidate',
        plan,
        `Break the plateau: ${fmt(plan)}`,
        `${fmt(planned)} has beaten you ${misses} sessions in a row. Do one session with an extra set at ${plan.value} ${unitWord(ex, plan.value)}. The added volume builds the strength to break through, then you go back to ${fmt(planned)}.`,
        `Still stuck after that? Finish with 2–3 slow negatives${prev ? `, add a few sets of ${prev.name}` : ''}, and rest the full ${restFor(ex)} between sets.`,
      );
    }

    return make(
      'repeat',
      planned,
      `Go again: ${fmt(planned)}`,
      `You got ${fmt(last)} of the planned ${fmt(planned)}. Same goal today. It often clicks on the next try.`,
      misses === PLATEAU_MISSES - 1
        ? `If it doesn't come today, the next session switches to an extra-volume set to break through.`
        : undefined,
    );
  }

  if (last.sets < target.sets) {
    const plan = { sets: last.sets + 1, value: Math.min(last.value, target.value) };
    return make(
      'add-set',
      plan,
      `Add a set: ${fmt(plan)}`,
      `You did ${fmt(last)}. Add one more set at the same ${unitWord(ex, 2)} before adding ${unitWord(ex, 2)}.`,
    );
  }

  const plan = { sets: target.sets, value: Math.min(target.value, last.value + step) };
  let streak = 0;
  for (const l of logs) {
    if (same(l, last)) streak++;
    else break;
  }
  const reason =
    streak >= 2
      ? `You've done ${fmt(last)} for ${streak} sessions in a row, so it's time to push: aim for ${plan.value} ${unitWord(ex, plan.value)} per set, even if the last set is a grind.`
      : `You hit ${fmt(last)} last time. Go for ${step} more ${unitWord(ex, step)} per set.`;
  return make('progress', plan, `Level up: ${fmt(plan)}`, reason);
}

/** How far past the mastery target a mastered exercise keeps adding reps (or seconds): up to twice it. */
const MAX_PAST_TARGET = 2;

/**
 * A mastered bodyweight exercise is open-ended, like a weighted one: hit the target (or your recent best) to
 * maintain it, and each time you complete the plan, the next session adds reps (or seconds) so your max keeps
 * growing, up to twice the target.
 */
function planMastered(
  ex: Exercise,
  logs: LogEntry[],
  now: Date,
  fmt: (p: SetsValue) => string,
  next: Exercise | undefined,
): SessionPlan {
  const target = ex.target;
  const cap = target.value * MAX_PAST_TARGET;
  const last = logs[0];
  const recent = !!last && Math.floor((now.getTime() - Date.parse(last.date)) / DAY) < RETURN_AFTER_DAYS;
  const make = (kind: PlanKind, plan: SetsValue, headline: string, reason: string): SessionPlan => ({
    kind,
    sets: plan.sets,
    value: plan.value,
    headline,
    reason,
    rest: restFor(ex),
    sessionsToMastery: sessionsToMastery(ex, plan),
  });

  if (recent && last.planned && meets(last, last.planned) && meets(last, target) && last.value < cap) {
    const plan = { sets: target.sets, value: Math.min(cap, last.value + stepFor(ex)) };
    const more = plan.value - last.value;
    return make(
      'progress',
      plan,
      `Beat your best: ${fmt(plan)}`,
      `You did ${fmt(last)} as planned. Mastered skills can keep improving: go for ${more} more ${unitWord(ex, more)} per set, or hit ${fmt(target)} to maintain it.`,
    );
  }

  const plan = { sets: target.sets, value: recent && meets(last, target) ? Math.min(cap, last.value) : target.value };
  const focus = next ? ` Your main progress is now ${next.name}.` : '';
  return make(
    'maintain',
    plan,
    `Maintain ${fmt(plan)}`,
    plan.value >= cap
      ? `You've mastered this at twice the target. Hit ${fmt(plan)} to keep it sharp.${focus}`
      : `You've mastered this. Hit ${fmt(plan)} to keep it sharp; complete it and the next session adds ${unitWord(ex, 2)}, so your max keeps growing.${focus}`,
  );
}

/**
 * Weighted exercises hold the target reps and add the smallest plate (5 lb or
 * 2.5 kg) each time you complete the plan. It's open-ended: once mastered, the
 * plan keeps adding weight while sessions go to plan.
 */
function planWeighted(ex: Exercise, logs: LogEntry[], { mastered, now, units }: Required<PlanOptions>): SessionPlan {
  const target = ex.target;
  const step = loadStepKg(units);
  const goalKg = snapLoad(target.addedKg ?? 0, units, 'up');
  const each = target.perSide ? ' each side' : '';
  const fmt = (p: SetsValue) => `${formatSet(p.sets, p.value, target.unit)}${each} at ${formatAdded(added(p), units)}`;
  const plate = formatWeight(step, units);
  const next = trackNeighbour(ex, 1);
  const last = logs[0];

  /** Target reps at `kg`, rounded to what you can load. */
  const at = (kg: number, sets = target.sets): SetsValue => ({ sets, value: target.value, addedKg: snapLoad(kg, units) });
  const make = (kind: PlanKind, plan: SetsValue, headline: string, reason: string, tip?: string): SessionPlan => ({
    kind,
    sets: plan.sets,
    value: plan.value,
    addedKg: added(plan),
    headline,
    reason,
    tip,
    rest: restFor(ex),
    sessionsToMastery: sessionsToMastery(ex, plan, units),
  });

  if (mastered) {
    if (last?.planned && meets(last, last.planned) && added(last) >= goalKg - 0.01) {
      const plan = at(added(last) + step);
      return make('progress', plan, `Add weight: ${fmt(plan)}`, `You did ${fmt(last)} as planned. Keep going past the target: ${plate} more.`);
    }
    const plan = at(Math.max(goalKg, last ? added(last) : 0));
    return make(
      'maintain',
      plan,
      `Maintain ${fmt(plan)}`,
      `You've mastered this. Keep it in your week and add ${plate} whenever the plan feels easy.`,
    );
  }

  if (!last) {
    const plan = at(step);
    return make(
      'start',
      plan,
      `Start with ${fmt(plan)}`,
      `Start light to get used to moving with weight. Each time you complete the plan, add ${plate}.`,
      'No belt or vest? A backpack with books or water bottles works.',
    );
  }

  if (meets(last, { sets: target.sets, value: target.value, addedKg: target.addedKg })) {
    return make(
      'mastery',
      at(goalKg),
      'Mastery target reached',
      `You did ${fmt(last)}, which meets the ${fmt(at(goalKg))} target. Mark it mastered${next ? ` and start ${next.name}` : ''}.`,
    );
  }

  const daysAway = Math.floor((now.getTime() - Date.parse(last.date)) / DAY);
  if (daysAway >= RETURN_AFTER_DAYS) {
    const plan = at(added(last) - 2 * step, Math.min(target.sets, last.sets));
    return make(
      'return',
      plan,
      `Ease back in: ${fmt(plan)}`,
      `It's been ${daysAway} days since your last session (${fmt(last)}). Start a little lighter and build back up.`,
    );
  }

  const planned = last.planned;
  if (planned && logs.length > 1 && !meets(last, planned)) {
    // Used less weight than planned, or fell well short on reps: drop the weight.
    if (added(last) < added(planned) - 0.01 || last.value < planned.value - 2) {
      const plan = at(Math.min(added(last), added(planned) - step), Math.max(last.sets, Math.min(target.sets, planned.sets)));
      return make(
        'reset',
        plan,
        `Lighten to ${fmt(plan)}`,
        `${fmt(last)} was well short of the planned ${fmt(planned)}, so the plan drops the weight and builds back up.`,
      );
    }

    let misses = 0;
    for (const l of logs) {
      if (l.planned && same(l.planned, planned) && !meets(l, l.planned)) misses++;
      else break;
    }

    if (misses >= PLATEAU_MISSES) {
      const plan = at(added(planned) - step, Math.max(planned.sets, target.sets) + 1);
      return make(
        'consolidate',
        plan,
        `Break the plateau: ${fmt(plan)}`,
        `${fmt(planned)} has beaten you ${misses} sessions in a row. Do one session with an extra set, ${plate} lighter. The added volume builds the strength to break through.`,
      );
    }

    return make('repeat', planned, `Go again: ${fmt(planned)}`, `You got ${fmt(last)} of the planned ${fmt(planned)}. Same weight today.`);
  }

  if (last.sets < target.sets) {
    const plan = at(added(last), last.sets + 1);
    return make('add-set', plan, `Add a set: ${fmt(plan)}`, `You did ${fmt(last)}. Add one more set at the same weight before going heavier.`);
  }

  if (last.value < target.value) {
    const plan = at(added(last));
    return make('repeat', plan, `Go again: ${fmt(plan)}`, `You did ${fmt(last)}. Get all ${target.value} reps at this weight, then add more.`);
  }

  const plan = at(Math.min(goalKg, added(last) + step));
  return make('progress', plan, `Add weight: ${fmt(plan)}`, `You hit ${fmt(last)}. Add ${plate} and keep the same reps.`);
}

/** Whether a plan raises the bar compared with the last session. */
export function isLevelUp(plan: SessionPlan): boolean {
  return plan.kind === 'progress' || plan.kind === 'add-set';
}
