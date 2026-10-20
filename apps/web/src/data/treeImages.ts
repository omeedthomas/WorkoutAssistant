import breakdance from '../assets/trees/breakdance.webp';
import core from '../assets/trees/core.webp';
import handstand from '../assets/trees/handstand.webp';
import hips from '../assets/trees/hips.webp';
import legs from '../assets/trees/legs.webp';
import levers from '../assets/trees/levers.webp';
import lowerBack from '../assets/trees/lower-back.webp';
import mobility from '../assets/trees/mobility.webp';
import muscleUp from '../assets/trees/muscle-up.webp';
import planche from '../assets/trees/planche.webp';
import pull from '../assets/trees/pull.webp';
import push from '../assets/trees/push.webp';
import shoulder from '../assets/trees/shoulder.webp';
import type { TreeId } from '@ascent/core/data/types';

/** Photos for the Home skill cards, from Unsplash (free under the Unsplash License; credits in the README). */
export const treeImages: Record<TreeId, string> = {
  push,
  pull,
  core,
  legs,
  handstand,
  planche,
  levers,
  'muscle-up': muscleUp,
  breakdance,
  shoulder,
  'lower-back': lowerBack,
  hips,
  mobility,
};
