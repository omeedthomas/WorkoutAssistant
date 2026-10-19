import { drillById } from './drills';

/**
 * Daily mobility: short follow-along routines to loosen up and start the day. Each is a list of drills
 * (`drills.ts`) played in order by the guided player, with no equipment beyond a chair, a wall or a towel.
 * Routine ids are stored with finished routines (`WorkoutRecord.routine`), so don't rename them.
 */
export interface Routine {
  id: string;
  name: string;
  /** For tight spaces, e.g. Home's chips. */
  short: string;
  /** What it loosens up, shown as chips. */
  areas: string[];
  description: string;
  /** Drill ids, in order. */
  moves: string[];
  color: string;
}

export const routines: Routine[] = [
  {
    id: 'wake-up',
    name: 'Morning Wake-up Flow',
    short: 'Wake-up Flow',
    areas: ['Spine', 'Shoulders', 'Hips', 'Legs'],
    description: 'A gentle head-to-toe flow for the first thing in the morning: wakes up your spine, opens your hips and gets blood moving.',
    moves: ['cat-cow', 'worlds-greatest-stretch', 'thread-needle', 'arm-circles', 'hip-circles', 'inchworm', 'deep-squat', 'standing-forward-fold'],
    color: '#ffa94d',
  },
  {
    id: 'upper-back',
    name: 'Upper Back & Thoracic Spine',
    short: 'Upper Back',
    areas: ['Upper back', 'Thoracic spine', 'Neck'],
    description: 'Undoes a hunched night or desk day: rotation and extension for the middle and upper back, plus an easy neck warm-up.',
    moves: [
      'neck-circles',
      'cat-cow',
      'quadruped-t-spine',
      'open-book',
      'seated-thoracic-extension',
      'thread-needle',
      'wall-slides',
      'childs-pose-reach',
      'sphinx',
    ],
    color: '#4dabf7',
  },
  {
    id: 'shoulders',
    name: 'Shoulder Mobility',
    short: 'Shoulders',
    areas: ['Shoulders', 'Chest', 'Lats'],
    description: 'Full, comfortable range for your shoulders: circles and controlled rotations, then stretches for the chest, back of the shoulder and lats.',
    moves: ['arm-circles', 'shoulder-cars', 'dislocates', 'wall-slides', 'scap-pushup', 'cross-body-stretch', 'chest-stretch', 'puppy-pose', 'lat-stretch'],
    color: '#5c7cfa',
  },
  {
    id: 'hips',
    name: 'Hip Mobility',
    short: 'Hips',
    areas: ['Hips', 'Glutes', 'Hip flexors', 'Groin'],
    description: 'For hips that feel stiff from sitting: rotation, hip flexor and glute stretches, finishing in a relaxed deep squat.',
    moves: ['hip-circles', 'worlds-greatest-stretch', 'ninety-ninety-switch', 'hip-cars', 'hip-flexor', 'frog-stretch', 'pigeon', 'deep-squat'],
    color: '#845ef7',
  },
  {
    id: 'legs',
    name: 'Legs & Ankles',
    short: 'Legs & Ankles',
    areas: ['Hamstrings', 'Calves', 'Ankles'],
    description: 'Loosens tight hamstrings and stiff ankles with gentle swings, nerve flossing and stretches you can feel working.',
    moves: ['leg-swings', 'ankle-circles', 'ankle-rocks', 'hamstring-floss', 'standing-forward-fold', 'calf-stretch', 'pike-fold', 'deep-squat'],
    color: '#20c997',
  },
];

export const routineById: Record<string, Routine> = Object.fromEntries(routines.map((r) => [r.id, r]));

/** Roughly how long the routine takes, in seconds. */
export const routineSeconds = (r: Routine) => r.moves.reduce((s, id) => s + drillById[id].seconds, 0);

export const routineMinutes = (r: Routine) => Math.max(1, Math.round(routineSeconds(r) / 60));
