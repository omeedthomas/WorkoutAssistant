import type { TreeId } from './types';

/** A suggested grouping of trees for one training day. */
export interface Split {
  id: string;
  name: string;
  focus: TreeId[];
  description: string;
  /** A lighter day for when everything else needs rest; never picked as "most rested". */
  restDay?: boolean;
}

export const splits: Split[] = [
  {
    id: 'push-pull',
    name: 'Push + Pull',
    focus: ['push', 'pull'],
    description: 'Upper-body strength. Training both keeps your shoulders balanced.',
  },
  {
    id: 'handstand-core',
    name: 'Handstand + Core',
    focus: ['handstand', 'core'],
    description: 'Balance and body line. A strong hollow body makes handstands click.',
  },
  {
    id: 'legs-core',
    name: 'Legs + Core',
    focus: ['legs', 'core'],
    description: 'Lower body and trunk, and a rest day for your arms.',
  },
  {
    id: 'statics',
    name: 'Planche + Levers',
    focus: ['planche', 'levers'],
    description: 'Straight-arm strength for the big static skills.',
  },
  {
    id: 'muscle-up',
    name: 'Muscle-up + Pull',
    focus: ['muscle-up', 'pull'],
    description: 'Explosive pulling, plus the transition over the bar.',
  },
  {
    id: 'full-body',
    name: 'Full body',
    focus: ['push', 'pull', 'legs', 'core'],
    description: 'A bit of everything. Ideal when you train 2–3 days a week.',
  },
  {
    id: 'recovery',
    name: 'Recovery & mobility',
    focus: ['shoulder', 'lower-back', 'hips', 'mobility'],
    description: 'Physical therapy and mobility for shoulders, lower back, hips and hamstrings. Great on rest days.',
    restDay: true,
  },
];

export const splitById: Record<string, Split> = Object.fromEntries(splits.map((s) => [s.id, s]));

/** Ways to arrange the splits across a week, with rest days in between. */
export interface WeeklyPlan {
  days: number;
  name: string;
  schedule: { day: string; split: string }[];
  note: string;
}

export const weeklyPlans: WeeklyPlan[] = [
  {
    days: 2,
    name: '2 days a week',
    schedule: [
      { day: 'Mon', split: 'full-body' },
      { day: 'Thu', split: 'full-body' },
    ],
    note: 'Two full-body days give every pattern enough practice to keep improving.',
  },
  {
    days: 3,
    name: '3 days a week',
    schedule: [
      { day: 'Mon', split: 'push-pull' },
      { day: 'Wed', split: 'legs-core' },
      { day: 'Fri', split: 'handstand-core' },
    ],
    note: 'The classic beginner-to-intermediate rotation, with a rest day after each session.',
  },
  {
    days: 4,
    name: '4 days a week',
    schedule: [
      { day: 'Mon', split: 'push-pull' },
      { day: 'Tue', split: 'legs-core' },
      { day: 'Thu', split: 'handstand-core' },
      { day: 'Sat', split: 'statics' },
    ],
    note: 'Adds a straight-arm skill day once your basics are solid.',
  },
  {
    days: 5,
    name: '5 days a week',
    schedule: [
      { day: 'Mon', split: 'push-pull' },
      { day: 'Tue', split: 'legs-core' },
      { day: 'Wed', split: 'handstand-core' },
      { day: 'Fri', split: 'statics' },
      { day: 'Sat', split: 'muscle-up' },
    ],
    note: 'For experienced trainees. Keep the pulling days apart and sleep well.',
  },
];
