import { useEffect, useState } from 'react';
import { exerciseById, treeById, type TreeId } from '../data';
import { drillById } from '../data/drills';
import type { PlanKind } from '../lib/progression';
import { LENGTHS, type Block, type Workout, type WorkoutLength } from '../lib/workout';

/**
 * A workout you've started. It's a snapshot, so logging sets mid-session
 * (which changes future plans) doesn't reshuffle the workout you're doing.
 * It only lasts for the day it was started.
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

const KEY = 'ascent:workout:v1';
const today = () => new Date().toDateString();

function load(): ActiveWorkout | null {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) ?? 'null') as ActiveWorkout | null;
    if (!w || w.day !== today() || !Array.isArray(w.main) || !(w.length in LENGTHS)) return null;
    // Drop anything that no longer exists in the catalog.
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
  } catch {
    return null;
  }
}

export function snapshot(w: Workout): ActiveWorkout {
  return {
    day: today(),
    startedAt: new Date().toISOString(),
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

/** Read-only peek for other pages (e.g. "Continue workout" on Home). */
export function loadActiveWorkout(): ActiveWorkout | null {
  return load();
}

/** Starts a workout from outside the Workout page (e.g. Home); the Workout page picks it up when it opens. */
export function saveActiveWorkout(w: ActiveWorkout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    // storage unavailable: nothing to hand over
  }
}

/** Forgets the started workout, e.g. on sign-out, since it belongs to that account. */
export function clearActiveWorkout() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: nothing was saved
  }
}

export function useActiveWorkout() {
  const [active, setActive] = useState<ActiveWorkout | null>(load);

  useEffect(() => {
    try {
      if (active) localStorage.setItem(KEY, JSON.stringify(active));
      else localStorage.removeItem(KEY);
    } catch {
      // storage unavailable: the workout lives for this page view only
    }
  }, [active]);

  return {
    active,
    /** Starts the workout and returns the snapshot (its `startedAt` identifies it). */
    start: (w: Workout) => {
      const started = snapshot(w);
      setActive(started);
      return started;
    },
    end: () => setActive(null),
    toggleDrill: (id: string) =>
      setActive((w) =>
        w && { ...w, checked: w.checked.includes(id) ? w.checked.filter((c) => c !== id) : [...w.checked, id] },
      ),
    checkDrill: (id: string) => setActive((w) => w && (w.checked.includes(id) ? w : { ...w, checked: [...w.checked, id] })),
    markLogged: (exerciseId: string, logged: ActiveExercise['logged']) =>
      setActive((w) => w && { ...w, main: w.main.map((m) => (m.exerciseId === exerciseId ? { ...m, logged } : m)) }),
    /** Opens the guided player (at `position`, when given) or goes back to the list. */
    setGuided: (guided: boolean, position?: number) =>
      setActive((w) => w && { ...w, guided, ...(position !== undefined && { position }) }),
    setPosition: (position: number) => setActive((w) => (w && w.position !== position ? { ...w, position } : w)),
  };
}
