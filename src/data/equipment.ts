import type { Equipment } from './types';

/** A way to do without a piece of equipment: other gear you might own, or something every home has. */
export interface Substitute {
  with: Equipment | 'household';
  note: string;
}

export interface EquipmentDef {
  id: Equipment;
  name: string;
  description: string;
  group: 'Bars & stations' | 'Weights' | 'Bands & balls' | 'Small gear';
  /** Stand-ins, best first. Without a workable one, exercises that need this are swapped for alternatives. */
  substitutes?: Substitute[];
}

/** Assumed everywhere, so exercises that only need these are always possible. */
export const HOUSEHOLD = 'Floor space, a wall, sturdy chairs, a table, a towel and a backpack';

export const equipmentList: EquipmentDef[] = [
  {
    id: 'pullup-bar',
    name: 'Pull-up bar',
    description: 'A doorway, wall-mounted or park bar you can hang from.',
    group: 'Bars & stations',
  },
  {
    id: 'dip-bars',
    name: 'Dip bars',
    description: 'Parallel bars or a dip station.',
    group: 'Bars & stations',
    substitutes: [
      { with: 'household', note: 'Use two sturdy chairs placed back to back (or the corner of a kitchen counter) as dip bars.' },
    ],
  },
  {
    id: 'parallettes',
    name: 'Parallettes',
    description: 'Low handles for L-sits, planches and push-ups.',
    group: 'Bars & stations',
    substitutes: [
      { with: 'dip-bars', note: 'Use your dip bars instead of parallettes.' },
      { with: 'household', note: 'Use two stacks of sturdy books or two chairs, or do it on the floor (a little harder).' },
    ],
  },
  {
    id: 'rings',
    name: 'Gymnastic rings',
    description: 'Hanging rings on straps.',
    group: 'Bars & stations',
  },
  {
    id: 'pole',
    name: 'Vertical pole',
    description: 'Stall bars or a sturdy upright pole, for the human flag.',
    group: 'Bars & stations',
  },
  {
    id: 'dumbbells',
    name: 'Dumbbells',
    description: 'Any pair of light-to-moderate dumbbells.',
    group: 'Weights',
    substitutes: [
      { with: 'kettlebell', note: 'Hold a kettlebell by the handle instead of a dumbbell.' },
      { with: 'household', note: 'Use filled water bottles, a gallon jug or tins instead of dumbbells.' },
    ],
  },
  {
    id: 'kettlebell',
    name: 'Kettlebell',
    description: 'A single kettlebell.',
    group: 'Weights',
    substitutes: [
      { with: 'dumbbells', note: 'Hold a dumbbell by one end instead of a kettlebell.' },
      { with: 'household', note: 'Use a backpack with books in it, or a jug with a handle, instead of a kettlebell.' },
    ],
  },
  {
    id: 'bands',
    name: 'Resistance bands',
    description: 'Loop or tube bands, light to medium.',
    group: 'Bands & balls',
  },
  {
    id: 'stability-ball',
    name: 'Exercise ball',
    description: 'A large inflatable stability (Swiss) ball.',
    group: 'Bands & balls',
  },
  {
    id: 'bosu',
    name: 'BOSU ball',
    description: 'A half ball with a flat platform on one side.',
    group: 'Bands & balls',
  },
  {
    id: 'foam-roller',
    name: 'Foam roller',
    description: 'For rolling out muscles and upper-back extensions.',
    group: 'Small gear',
    substitutes: [{ with: 'household', note: 'Use a tightly rolled towel instead of a foam roller.' }],
  },
  {
    id: 'ab-wheel',
    name: 'Ab wheel',
    description: 'A roller wheel with handles.',
    group: 'Small gear',
    substitutes: [
      { with: 'stability-ball', note: 'Roll out on your exercise ball instead of an ab wheel (a bit easier).' },
      { with: 'household', note: 'Slide your hands out on a towel on a smooth floor instead of an ab wheel.' },
    ],
  },
];

export const equipmentById = Object.fromEntries(equipmentList.map((e) => [e.id, e])) as Record<Equipment, EquipmentDef>;

export const equipmentGroups = [...new Set(equipmentList.map((e) => e.group))];
