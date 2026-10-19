import { exerciseById, type Unit } from '../data';
import type { Units } from '../lib/units';
import { localDay, type ProgressState, type OwnedEquipment, type WeighIn, type WeightGoal, type Work, type WorkoutPlan, type WorkoutRecord } from '../state/progress';
import { stable } from './merge';
import type { CloudDocs, SaveOps } from './types';

/**
 * How progress is laid out in the cloud. In Google Drive:
 *
 *   Ascent/progress.json                        ← `progress`: mastered skills, goals, weight goal, units, workout plan, equipment
 *   Ascent/workouts/2026-10-18 Push + Pull.json ← `day:2026-10-18`: that day's workouts, every logged set and the weigh-in
 *
 * Files are plain, readable JSON (exercise names and units included), so you
 * can open them in Drive, and editing one is picked up on the next sync.
 */

export const PROGRESS_KEY = 'progress';
export const dayKey = (day: string) => `day:${day}`;
export const dayOfKey = (key: string) => (key.startsWith('day:') ? key.slice(4) : null);

export interface ProgressDoc {
  app: 'Ascent';
  kind: 'progress';
  version: 1;
  mastered: Record<string, string>;
  goals: string[];
  onboarded: boolean;
  weightGoal: WeightGoal | null;
  units: Units;
  workoutPlan: WorkoutPlan | null;
  equipment: OwnedEquipment | null;
}

export interface DaySession {
  id: string;
  /** When it was logged (ISO). */
  time: string;
  exercise: string;
  name: string;
  sets: number;
  value: number;
  unit: Unit;
  perSide?: boolean;
  /** Weighted exercises: added weight in kg. */
  addedKg?: number;
  planned?: Work;
}

export interface DayDoc {
  app: 'Ascent';
  kind: 'workout-day';
  version: 1;
  date: string;
  title: string;
  workouts: WorkoutRecord[];
  sessions: DaySession[];
  /** Body weight logged that day. */
  weight?: WeighIn;
}

/** "Push + Pull", "Push + Pull & Legs + Core", or "Training" for days without a planned workout. */
export function dayTitle(workouts: WorkoutRecord[]): string {
  const titles = [...new Set(workouts.map((w) => w.title))];
  return titles.length ? titles.join(' & ') : 'Training';
}

export function toDocs(state: ProgressState): CloudDocs {
  const progress: ProgressDoc = {
    app: 'Ascent',
    kind: 'progress',
    version: 1,
    mastered: state.mastered,
    goals: state.goals,
    onboarded: state.onboarded,
    weightGoal: state.weightGoal,
    units: state.units,
    workoutPlan: state.workoutPlan,
    equipment: state.equipment,
  };
  const docs: CloudDocs = { [PROGRESS_KEY]: progress };

  const sessions = new Map<string, DaySession[]>();
  for (const [id, list] of Object.entries(state.logs)) {
    const ex = exerciseById[id];
    for (const l of list) {
      const day = l.day ?? localDay(l.date);
      const s: DaySession = {
        id: l.id,
        time: l.date,
        exercise: id,
        name: ex?.name ?? id,
        sets: l.sets,
        value: l.value,
        unit: ex?.target.unit ?? 'reps',
        ...(ex?.target.perSide && { perSide: true }),
        ...(l.addedKg !== undefined && { addedKg: l.addedKg }),
        ...(l.planned && { planned: l.planned }),
      };
      sessions.set(day, [...(sessions.get(day) ?? []), s]);
    }
  }

  for (const day of new Set([...sessions.keys(), ...Object.keys(state.workouts), ...Object.keys(state.weight)])) {
    const workouts = state.workouts[day] ?? [];
    const daySessions = sessions.get(day) ?? [];
    const doc: DayDoc = {
      app: 'Ascent',
      kind: 'workout-day',
      version: 1,
      date: day,
      title: workouts.length || daySessions.length ? dayTitle(workouts) : 'Weigh-in',
      workouts,
      sessions: daySessions.sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id)),
      ...(state.weight[day] && { weight: state.weight[day] }),
    };
    docs[dayKey(day)] = doc;
  }
  return docs;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Rebuilds the raw progress shape from documents. Run the result through `sanitizeProgress`. */
export function fromDocs(docs: CloudDocs): unknown {
  const progress = isRecord(docs[PROGRESS_KEY]) ? docs[PROGRESS_KEY] : {};
  const logs: Record<
    string,
    { id: unknown; date: unknown; day: string; sets: unknown; value: unknown; addedKg?: unknown; planned?: unknown }[]
  > = {};
  const workouts: Record<string, unknown[]> = {};
  const weight: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const [key, doc] of Object.entries(docs)) {
    const day = dayOfKey(key);
    if (!day || !isRecord(doc)) continue;
    if (Array.isArray(doc.workouts) && doc.workouts.length) workouts[day] = doc.workouts;
    if (isRecord(doc.weight)) weight[day] = doc.weight;
    if (!Array.isArray(doc.sessions)) continue;
    for (const s of doc.sessions) {
      if (!isRecord(s) || typeof s.exercise !== 'string' || typeof s.id !== 'string' || seen.has(s.id)) continue;
      seen.add(s.id);
      (logs[s.exercise] ??= []).push({
        id: s.id,
        date: s.time,
        day,
        sets: s.sets,
        value: s.value,
        ...(s.addedKg !== undefined && { addedKg: s.addedKg }),
        ...(isRecord(s.planned) && { planned: s.planned }),
      });
    }
  }
  for (const list of Object.values(logs)) list.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    version: 1,
    mastered: progress.mastered ?? {},
    goals: progress.goals ?? [],
    onboarded: progress.onboarded === true,
    logs,
    workouts,
    weight,
    weightGoal: progress.weightGoal ?? null,
    units: progress.units,
    workoutPlan: progress.workoutPlan ?? null,
    equipment: progress.equipment ?? null,
  };
}

/** The documents that must be written (or removed) to turn `synced` into `next`. Null when nothing changed. */
export function diffDocs(synced: ProgressState, next: ProgressState): SaveOps | null {
  const before = toDocs(synced);
  const after = toDocs(next);
  const ops: SaveOps = { set: {}, remove: [] };
  for (const [key, doc] of Object.entries(after)) if (stable(before[key]) !== stable(doc)) ops.set[key] = doc;
  for (const key of Object.keys(before)) if (!(key in after)) ops.remove.push(key);
  return Object.keys(ops.set).length || ops.remove.length ? ops : null;
}
