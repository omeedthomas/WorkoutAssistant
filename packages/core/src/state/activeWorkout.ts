import { exerciseById, treeById, type TreeId } from '../data';
import { drillById } from '../data/drills';
import type { PlanKind } from '../lib/progression';
import { LENGTHS, type Block, type Workout, type WorkoutLength } from '../lib/workout';

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
  logged?: { sets: number; value: number; addedKg?: number; logId: string };
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
    main: w.main.filter((m) => exerciseById[m.exerciseId]),
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

export function workoutProgress(w: ActiveWorkout): { done: number; total: number } {
  const total = w.warmup.length + w.main.length + w.cooldown.length;
  const done = w.checked.filter((id) => w.warmup.includes(id) || w.cooldown.includes(id)).length + w.main.filter((m) => m.logged).length;
  return { done, total };
}
