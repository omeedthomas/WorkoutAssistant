import { exerciseById } from '../data';
import { drillById, drillVideo } from '../data/drills';
import type { Routine } from '../data/routines';
import { videos, type ExerciseVideo } from '../data/videos';
import type { ActiveWorkout } from '../state/activeWorkout';
import { restSeconds } from './progression';
import { formatAdded, toUnits, type Units } from './units';

/**
 * A guided workout plays a started workout one step at a time: every set of every drill and exercise, top to
 * bottom, with rest in between. Timed steps run a timer (after a short get-ready countdown); rep steps wait
 * for you to tap Done.
 */
export type GuidedPhase = 'warmup' | 'main' | 'cooldown' | 'mobility';

export interface GuidedStep {
  /** Which drill or exercise this step belongs to, as an index into the workout's items (warm-up, main, cooldown). */
  item: number;
  kind: 'drill' | 'exercise';
  /** The drill or exercise id. */
  id: string;
  phase: GuidedPhase;
  name: string;
  video?: ExerciseVideo;
  cue: string;
  /** How to set up without the usual equipment. */
  setup?: string;
  set: number;
  sets: number;
  /** Timed work done once per side runs each side as its own step. */
  side?: { index: 0 | 1; label: string };
  /** Timed steps: how long to hold or keep going. */
  seconds?: number;
  /** Rep steps: what to do, e.g. "12 reps", "10 reps each side", "10 each direction". */
  reps?: string;
  /** Exercises: the planned reps (or seconds) per set. The players log it for each set unless you change it. */
  value?: number;
  /** Weighted exercises: the added weight, e.g. "+10 lb", and how to say it. */
  load?: { text: string; spoken: string };
  /** Rest after this step, in seconds. 0 goes straight on (e.g. switching sides, or one drill to the next). */
  rest: number;
}

const SIDES = ['Left side', 'Right side'] as const;

/** Rest between rounds of a timed drill, like 2 × 15 s hangs. */
export const DRILL_SET_REST = 15;
/** A breather between the warm-up, the main work and the cooldown. */
export const PHASE_REST = 30;
/** Most rest you get when moving on to a different exercise, since other muscles are up next. */
const MAX_SWITCH_REST = 60;
/** Countdown before a timed step starts, so you can get into position. */
export const GET_READY_SECONDS = 5;

const UNIT_WORDS: Record<Units, string> = { lb: 'pounds', kg: 'kilos' };

/** A drill's steps: one for a rep drill, or one per round (and side) for a timed one. */
function drillSteps(id: string, phase: GuidedPhase, item: number): GuidedStep[] {
  const d = drillById[id];
  const base = { item, kind: 'drill' as const, id, phase, name: d.name, video: drillVideo(d), cue: d.cue };
  if (!d.timer) return [{ ...base, set: 1, sets: 1, reps: d.dose, rest: 0 }];
  const steps: GuidedStep[] = [];
  const { sets, seconds, sides } = d.timer;
  for (let set = 1; set <= sets; set++) {
    const rest = set < sets ? DRILL_SET_REST : 0;
    if (!sides) steps.push({ ...base, set, sets, seconds, rest });
    else for (const index of [0, 1] as const) steps.push({ ...base, set, sets, seconds, side: { index, label: sides[index] }, rest: index ? rest : 0 });
  }
  return steps;
}

/** A daily mobility routine: its moves back to back, timed ones with the usual get-ready countdown. */
export function routineSteps(r: Routine): GuidedStep[] {
  return r.moves.flatMap((id, item) => drillSteps(id, 'mobility', item));
}

/** Every set (and side) of the workout, in order. */
export function guidedSteps(w: ActiveWorkout, units: Units): GuidedStep[] {
  const steps: GuidedStep[] = [];
  let item = 0;

  const addDrill = (id: string, phase: GuidedPhase) => {
    steps.push(...drillSteps(id, phase, item));
    item++;
  };

  for (const id of w.warmup) addDrill(id, 'warmup');

  for (const m of w.main) {
    const ex = exerciseById[m.exerciseId];
    const perSide = !!ex.target.perSide;
    const timed = ex.target.unit === 'seconds';
    const load =
      m.addedKg !== undefined && m.addedKg > 0.01
        ? { text: formatAdded(m.addedKg, units), spoken: `${toUnits(m.addedKg, units)} ${UNIT_WORDS[units]} added` }
        : undefined;
    const base = {
      item,
      kind: 'exercise' as const,
      id: ex.id,
      phase: 'main' as const,
      name: ex.name,
      video: videos[ex.id],
      cue: ex.cues[0] ?? ex.description,
      ...(m.setup && { setup: m.setup }),
      ...(load && { load }),
      sets: m.sets,
      value: m.value,
    };
    for (let set = 1; set <= m.sets; set++) {
      const rest = set < m.sets ? restSeconds(ex) : 0;
      if (!timed) {
        steps.push({ ...base, set, reps: `${m.value} ${m.value === 1 ? 'rep' : 'reps'}${perSide ? ' each side' : ''}`, rest });
      } else if (!perSide) {
        steps.push({ ...base, set, seconds: m.value, rest });
      } else {
        for (const index of [0, 1] as const) {
          steps.push({ ...base, set, seconds: m.value, side: { index, label: SIDES[index] }, rest: index ? rest : 0 });
        }
      }
    }
    item++;
  }

  for (const id of w.cooldown) addDrill(id, 'cooldown');

  // Rest when moving on to the next item: a breather between phases, a short one between exercises.
  for (let i = 0; i < steps.length - 1; i++) {
    const s = steps[i];
    const next = steps[i + 1];
    if (next.item === s.item) continue;
    if (next.phase !== s.phase) s.rest = PHASE_REST;
    else if (s.kind === 'exercise') s.rest = Math.min(restSeconds(exerciseById[s.id]), MAX_SWITCH_REST);
  }
  return steps;
}

/** Index of the first step of a drill or exercise, e.g. to start the guided workout from it. */
export function firstStepOf(steps: GuidedStep[], kind: GuidedStep['kind'], id: string): number {
  return Math.max(0, steps.findIndex((s) => s.kind === kind && s.id === id));
}

export const isLastOfItem = (steps: GuidedStep[], i: number) => steps[i + 1]?.item !== steps[i].item;

/** "30 seconds", "1 minute", "2 minutes 30 seconds". */
export function spokenDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const sec = `${s} ${s === 1 ? 'second' : 'seconds'}`;
  if (!m) return sec;
  const min = `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  return s ? `${min} ${sec}` : min;
}

/** How much a step asks for, written out: "10 reps", "8 reps each side", "10 each direction", "45 seconds". */
export function workLabel(step: GuidedStep): string {
  return step.seconds !== undefined ? spokenDuration(step.seconds) : (step.reps ?? '');
}

/** A timer readout: "0:45", "2:00". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** What the announcer says as a step begins: "Set 2 of 3. Time to do Push-up for 12 reps." */
export function startAnnouncement(step: GuidedStep): string {
  if (step.side?.index === 1) return `Switch sides. ${step.side.label}, ${spokenDuration(step.seconds!)}.`;
  const set = step.sets > 1 ? `Set ${step.set} of ${step.sets}. ` : '';
  if (step.seconds !== undefined) {
    const side = step.side ? `, ${step.side.label.toLowerCase()} first` : '';
    return `${set}Time to do ${step.name} for ${spokenDuration(step.seconds)}${side}.`;
  }
  if (step.kind === 'drill') return `${set}Time to do ${step.name}: ${step.reps}.`;
  return `${set}Time to do ${step.name} for ${step.reps}${step.load ? `, with ${step.load.spoken}` : ''}.`;
}

/** What the announcer says when rest starts: "Rest for 2 minutes. Next up: Push-up, set 2 of 3." */
export function restAnnouncement(seconds: number, next: GuidedStep): string {
  const set = next.sets > 1 ? `, set ${next.set} of ${next.sets}` : '';
  return `Rest for ${spokenDuration(seconds)}. Next up: ${next.name}${set}.`;
}
