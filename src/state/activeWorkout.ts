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
  kind: PlanKind;
  reason: string;
  why: string;
  block: Block;
  logged?: { sets: number; value: number; logId: string };
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
      kind: m.plan.kind,
      reason: m.plan.reason,
      why: m.why,
      block: m.block,
    })),
    notes: w.notes,
    checked: [],
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
    start: (w: Workout) => setActive(snapshot(w)),
    end: () => setActive(null),
    toggleDrill: (id: string) =>
      setActive((w) =>
        w && { ...w, checked: w.checked.includes(id) ? w.checked.filter((c) => c !== id) : [...w.checked, id] },
      ),
    markLogged: (exerciseId: string, logged: ActiveExercise['logged']) =>
      setActive((w) => w && { ...w, main: w.main.map((m) => (m.exerciseId === exerciseId ? { ...m, logged } : m)) }),
  };
}
