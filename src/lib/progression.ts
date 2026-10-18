import { dependentsOf, exerciseById, trackByKey, type Exercise } from '../data';
import type { LogEntry } from '../state/progress';
import { formatSet } from './format';

/**
 * Turns an exercise's logged history into a prescription for the next session
 * ("double progression"): first build up to the target number of sets, then
 * add reps (or seconds) each time you complete the plan, until you reach the
 * mastery target. Missed plans are repeated; repeated misses switch to an
 * extra-volume session to break the plateau.
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
  headline: string;
  reason: string;
  tip?: string;
  rest: string;
  /** Successful sessions, starting with this one, until the mastery target at this pace. */
  sessionsToMastery: number;
}

type SetsValue = Pick<LogEntry, 'sets' | 'value'>;

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

export function restFor(ex: Exercise): string {
  if (ex.level <= 2) return '60–90 s';
  if (ex.level <= 5) return '90 s – 2 min';
  return '2–3 min';
}

const meets = (done: SetsValue, goal: SetsValue) => done.sets >= goal.sets && done.value >= goal.value;
const same = (a: SetsValue, b: SetsValue) => a.sets === b.sets && a.value === b.value;

export function sessionsToMastery(ex: Exercise, plan: SetsValue): number {
  const { sets, value } = ex.target;
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

export function planSession(
  ex: Exercise,
  logs: LogEntry[] = [],
  { mastered = false, now = new Date() }: { mastered?: boolean; now?: Date } = {},
): SessionPlan {
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

  if (mastered) {
    return make(
      'maintain',
      target,
      `Maintain ${fmt(target)}`,
      next
        ? `You've mastered this. Keep it sharp in your warm-ups and put your effort into ${next.name}.`
        : `You've mastered this. Keep it sharp with a set or two in your warm-ups.`,
    );
  }

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

/** Whether a plan raises the bar compared with the last session. */
export function isLevelUp(plan: SessionPlan): boolean {
  return plan.kind === 'progress' || plan.kind === 'add-set';
}
