export type TreeId =
  | 'push'
  | 'pull'
  | 'core'
  | 'legs'
  | 'handstand'
  | 'planche'
  | 'levers'
  | 'muscle-up';

export type Unit = 'reps' | 'seconds';

/** What "mastered" means for an exercise, e.g. 3 sets × 10 reps. */
export interface Target {
  sets: number;
  value: number;
  unit: Unit;
  /** The target applies to each side (left and right). */
  perSide?: boolean;
  /** Weighted exercises: the added weight to master it with, in kg. */
  addedKg?: number;
}

export interface StepDef {
  id: string;
  name: string;
  /** Difficulty from 1 (anyone can start here) to 10 (elite). */
  level: number;
  target: Target;
  description: string;
  cues: string[];
  /** Extra prerequisites on top of the previous step in the same track. */
  requires?: string[];
}

/**
 * A linear progression, e.g. wall push-up → knee push-up → push-up.
 * Each step implicitly requires the step before it.
 */
export interface TrackDef {
  id: string;
  name: string;
  /** Prerequisites of the track's first step (often from another track or tree). */
  from?: string[];
  steps: StepDef[];
}

export interface TreeDef {
  id: TreeId;
  name: string;
  tagline: string;
  color: string;
  /** The signature skill at the top of the tree. Home shows progress toward it. */
  ultimate: string;
  tracks: TrackDef[];
}

export interface Exercise extends Omit<StepDef, 'requires'> {
  tree: TreeId;
  /** Globally unique track key: `${tree}/${track id}`. */
  track: string;
  trackName: string;
  /** Position within its track (0 = first step). */
  step: number;
  /** All direct prerequisites (previous step + track `from` + step `requires`). */
  requires: string[];
}

export interface Track {
  key: string;
  tree: TreeId;
  name: string;
  steps: Exercise[];
}
