import { exerciseById, trackByKey, treeById, type Equipment, type Exercise, type TreeId } from '../data';
import { drillById } from '../data/drills';
import { canDo } from '../lib/equipment';
import { firstStepOf, guidedSteps } from '../lib/guided';
import { planSession, type PlanKind } from '../lib/progression';
import { LENGTHS, type Block, type Workout, type WorkoutLength } from '../lib/workout';
import type { Feel, ProgressState, Work, WorkoutRating } from './progress';

/**
 * A workout you've started. It's a snapshot, so logging sets mid-session
 * (which changes future plans) doesn't reshuffle the workout you're doing.
 * It only lasts for the day it was started. Each app stores it its own way.
 */
export interface ActiveExercise {
  exerciseId: string;
  sets: number;
  value: number;
  /** Weighted exercises: planned added weight in kg. */
  addedKg?: number;
  kind: PlanKind;
  reason: string;
  why: string;
  block: Block;
  /** How to set up without the usual equipment. */
  setup?: string;
  /** What was logged (each set, if they differed) and the log entry it went into. */
  logged?: Work & { logId: string };
  /** Switched to (an easier step) from this exercise mid-workout, so you can switch back. */
  swappedFrom?: Omit<ActiveExercise, 'logged' | 'swappedFrom'>;
}

export interface ActiveWorkout {
  day: string;
  startedAt: string;
  focus: TreeId[];
  length: WorkoutLength;
  warmup: string[];
  main: ActiveExercise[];
  cooldown: string[];
  notes: string[];
  /** Drill ids that have been ticked off. */
  checked: string[];
  /** Showing the guided, step-by-step player (rather than the list). */
  guided: boolean;
  /** The guided player's current step, so a reload picks up where you were. */
  position: number;
}

const dayOf = (now: Date) => now.toDateString();

/** A stored workout, if it's from today; anything that no longer exists in the catalog is dropped. */
export function restoreActiveWorkout(raw: unknown, now = new Date()): ActiveWorkout | null {
  const w = raw as ActiveWorkout | null;
  if (!w || typeof w !== 'object' || w.day !== dayOf(now) || !Array.isArray(w.main) || !(w.length in LENGTHS)) return null;
  return {
    ...w,
    focus: w.focus.filter((t) => t in treeById),
    warmup: w.warmup.filter((id) => drillById[id]),
    cooldown: w.cooldown.filter((id) => drillById[id]),
    main: w.main
      .filter((m) => exerciseById[m.exerciseId])
      .map((m) => (m.swappedFrom && !exerciseById[m.swappedFrom.exerciseId] ? { ...m, swappedFrom: undefined } : m)),
    checked: Array.isArray(w.checked) ? w.checked : [],
    notes: Array.isArray(w.notes) ? w.notes : [],
    guided: w.guided === true,
    position: Number.isInteger(w.position) && w.position > 0 ? w.position : 0,
  };
}

export function snapshot(w: Workout, now = new Date()): ActiveWorkout {
  return {
    day: dayOf(now),
    startedAt: now.toISOString(),
    focus: w.focus,
    length: w.length,
    warmup: w.warmup.map((d) => d.id),
    cooldown: w.cooldown.map((d) => d.id),
    main: w.main.map((m) => ({
      exerciseId: m.exercise.id,
      sets: m.plan.sets,
      value: m.plan.value,
      ...(m.plan.addedKg !== undefined && { addedKg: m.plan.addedKg }),
      kind: m.plan.kind,
      reason: m.plan.reason,
      why: m.why,
      block: m.block,
      ...(m.setup && { setup: m.setup }),
    })),
    notes: w.notes,
    checked: [],
    guided: true,
    position: 0,
  };
}

/**
 * The step to switch to when an exercise is too hard mid-workout: the previous step of its progression (for a
 * first step, the one its progression starts from), going further down past steps you lack the equipment for or
 * that are already in the workout. Null at the bottom of a ladder.
 */
export function easierStep(w: ActiveWorkout, exerciseId: string, have: Equipment[] | null): Exercise | null {
  const inWorkout = new Set(w.main.map((m) => m.exerciseId));
  let ex: Exercise | undefined = exerciseById[exerciseId];
  for (let guard = 0; ex && guard < 20; guard++) {
    const cur: Exercise = ex;
    const from = cur.requires.map((id) => exerciseById[id]).filter(Boolean);
    ex = trackByKey[cur.track]?.steps[cur.step - 1] ?? from.find((e) => e.tree === cur.tree) ?? from[0];
    if (ex && !inWorkout.has(ex.id) && canDo(ex, have)) return ex;
  }
  return null;
}

/**
 * Switches an exercise you haven't logged yet for another: an easier step (planned from your history for it), or
 * back to the one it replaced (as it was planned). The guided player picks up at the new exercise's first set.
 */
export function swapExercise(w: ActiveWorkout, fromId: string, toId: string, state: ProgressState, now = new Date()): ActiveWorkout {
  const m = w.main.find((x) => x.exerciseId === fromId);
  const to = exerciseById[toId];
  if (!m || m.logged || !to || (toId !== fromId && w.main.some((x) => x.exerciseId === toId))) return w;
  const original = m.swappedFrom ?? { ...m };
  let next: ActiveExercise;
  if (original.exerciseId === toId) {
    next = { ...original };
  } else {
    const plan = planSession(to, state.logs[toId], { mastered: !!state.mastered[toId], now, units: state.units });
    next = {
      exerciseId: toId,
      sets: plan.sets,
      value: plan.value,
      ...(plan.addedKg !== undefined && { addedKg: plan.addedKg }),
      kind: plan.kind,
      reason: plan.reason,
      why: `Easier than ${exerciseById[original.exerciseId].name}`,
      block: m.block,
      swappedFrom: original,
    };
  }
  const swapped = { ...w, main: w.main.map((x) => (x === m ? next : x)) };
  return { ...swapped, position: firstStepOf(guidedSteps(swapped, state.units), 'exercise', toId) };
}

/**
 * After a workout you say how it felt. Too easy or too hard marks the logged exercises you picked, so each
 * one's next plan steps up or eases off; just right changes nothing.
 */
export function feedbackFor(w: ActiveWorkout, rating: WorkoutRating | null, picked: string[]): { exerciseId: string; logId: string; feel: Feel }[] {
  const feel: Feel | null = rating === 'easy' ? 'easy' : rating === 'hard' ? 'hard' : null;
  if (!feel) return [];
  return w.main.flatMap((m) => (m.logged && picked.includes(m.exerciseId) ? [{ exerciseId: m.exerciseId, logId: m.logged.logId, feel }] : []));
}

export function workoutProgress(w: ActiveWorkout): { done: number; total: number } {
  const total = w.warmup.length + w.main.length + w.cooldown.length;
  const done = w.checked.filter((id) => w.warmup.includes(id) || w.cooldown.includes(id)).length + w.main.filter((m) => m.logged).length;
  return { done, total };
}
