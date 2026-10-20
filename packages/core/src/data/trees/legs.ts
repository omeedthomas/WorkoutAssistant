import { reps, repsEach, weightedEach } from '../targets';
import type { TreeDef } from '../types';

export const legs: TreeDef = {
  id: 'legs',
  name: 'Legs',
  tagline: 'Squats to pistols and shrimps, glute bridges to Nordic curls.',
  color: '#0ca678',
  ultimate: 'pistol-squat',
  kind: 'skill',
  tracks: [
    {
      id: 'squat',
      name: 'Squat to Pistol',
      steps: [
        {
          id: 'assisted-squat',
          name: 'Assisted Squat',
          level: 1,
          target: reps(3, 15),
          description:
            'Hold a doorframe, post or the back of a chair while you squat. Your arms can help you up through the hard part.',
          cues: [
            'Feet shoulder width, toes slightly out',
            'Sit back and down; knees follow your toes',
            'Use your arms as little as possible',
          ],
        },
        {
          id: 'squat',
          name: 'Bodyweight Squat',
          level: 1,
          target: reps(3, 20),
          description: 'Full-depth bodyweight squat with your heels on the floor.',
          cues: [
            'Hips go below your knees',
            'Chest up, heels down',
            'Drive up through your whole foot',
          ],
        },
        {
          id: 'split-squat',
          name: 'Split Squat',
          level: 2,
          target: repsEach(3, 12),
          description: 'Staggered stance, lower your back knee toward the floor and stand back up.',
          cues: [
            'Front shin roughly vertical',
            'Back knee lightly touches the floor',
            'Torso tall',
          ],
        },
        {
          id: 'bulgarian-split-squat',
          name: 'Bulgarian Split Squat',
          level: 3,
          target: repsEach(3, 10),
          description:
            'Split squat with your back foot raised on a bench. Puts most of the load on the front leg.',
          cues: [
            'Laces of the back foot on the bench',
            'Most of your weight on the front heel',
            'Control the bottom',
          ],
        },
        {
          id: 'box-pistol',
          name: 'Box Pistol Squat',
          level: 4,
          target: repsEach(3, 8),
          description:
            'Single-leg squat down to a box or bench, then stand back up. Lower the box over time.',
          cues: [
            'Free leg extended in front',
            'Sit down slowly; no dropping',
            'Arms forward for balance',
          ],
        },
        {
          id: 'pistol-squat',
          name: 'Pistol Squat',
          level: 6,
          target: repsEach(3, 5),
          description:
            'A full single-leg squat with the other leg held straight in front. Takes strength, balance and mobility.',
          cues: [
            'Heel stays down',
            'Reach forward to counterbalance',
            'Hold a light weight in front if you keep falling backward',
          ],
        },
      ],
    },
    {
      id: 'shrimp',
      name: 'Shrimp Squat',
      from: ['bulgarian-split-squat'],
      steps: [
        {
          id: 'beginner-shrimp-squat',
          name: 'Beginner Shrimp Squat',
          level: 4,
          target: repsEach(3, 6),
          description:
            'Single-leg squat with the free leg bent behind you. Lower until that knee touches a pad.',
          cues: [
            'Arms forward for balance',
            'Lower slowly to the pad',
            'Keep your torso fairly upright',
          ],
        },
        {
          id: 'shrimp-squat',
          name: 'Shrimp Squat',
          level: 6,
          target: repsEach(3, 5),
          description: 'Hold your back foot with your hand and lower until your knee touches the floor.',
          cues: ['Hold your back ankle', 'Knee just kisses the floor', 'Drive up through your heel'],
        },
      ],
    },
    {
      id: 'hinge',
      name: 'Hinge & Hamstrings',
      steps: [
        {
          id: 'glute-bridge',
          name: 'Glute Bridge',
          level: 1,
          target: reps(3, 15),
          description: 'On your back with knees bent, drive your hips up until your body is straight.',
          cues: ['Push through your heels', 'Squeeze your glutes at the top', "Don't over-arch your back"],
        },
        {
          id: 'single-leg-glute-bridge',
          name: 'Single-leg Glute Bridge',
          level: 2,
          target: repsEach(3, 12),
          description: 'Glute bridge on one leg with the other leg held straight.',
          cues: ['Keep your hips level', 'Pause at the top', 'Drive through the heel'],
        },
        {
          id: 'slider-leg-curl',
          name: 'Slider Leg Curl',
          level: 3,
          target: reps(3, 10),
          description:
            'In a bridge position with your heels on sliders or a towel, slide your feet out and curl them back in.',
          cues: [
            'Hips stay up the whole time',
            'Slide out slowly',
            'Curl your heels back toward your glutes',
          ],
        },
        {
          id: 'nordic-negative',
          name: 'Nordic Curl Negative',
          level: 5,
          target: reps(3, 5),
          description:
            'Kneel with your ankles anchored and lower your body forward as slowly as you can. Catch yourself with your hands.',
          cues: [
            'Hips extended in one line from knees to head',
            'Fight the fall the whole way down',
            'Push off the floor to get back up',
          ],
        },
        {
          id: 'nordic-curl',
          name: 'Nordic Curl',
          level: 8,
          target: reps(3, 3),
          description:
            'Lower all the way down and pull yourself back up using only your hamstrings. One of the hardest leg exercises there is.',
          cues: ['Keep your hips straight', 'Pull with your heels', 'Use a small push only if you need it'],
        },
      ],
    },
    {
      id: 'calves',
      name: 'Calves',
      steps: [
        {
          id: 'calf-raise',
          name: 'Calf Raise',
          level: 1,
          target: reps(3, 20),
          description: 'Rise up onto the balls of your feet on a step, then lower your heels below the step.',
          cues: ['Full stretch at the bottom', 'Pause at the top', 'Hold something for balance'],
        },
        {
          id: 'single-leg-calf-raise',
          name: 'Single-leg Calf Raise',
          level: 2,
          target: repsEach(3, 15),
          description: 'Calf raise on one leg. Builds ankle strength for jumping and landing.',
          cues: ['Slow on the way down', 'Full range every rep', 'Keep your knee soft'],
        },
      ],
    },
    {
      id: 'weighted-split-squats',
      name: 'Weighted Split Squats',
      from: ['bulgarian-split-squat'],
      steps: [
        {
          id: 'weighted-bulgarian-split-squat',
          name: 'Weighted Bulgarian Split Squat',
          level: 4,
          target: weightedEach(3, 8, 20),
          description:
            'Bulgarian split squats holding dumbbells (or a loaded backpack). Log the total added weight, both hands together.',
          cues: [
            'Back foot on a bench, front foot far enough forward to keep your heel down',
            'Weights hang straight down at your sides',
            'Drop your back knee toward the floor, then drive up through the front heel',
          ],
        },
      ],
    },
    {
      id: 'bosu-balance',
      name: 'Balance on a BOSU',
      from: ['squat'],
      steps: [
        {
          id: 'bosu-squat',
          name: 'BOSU Squat',
          level: 2,
          target: reps(3, 12),
          equipment: ['bosu'],
          alternatives: ['split-squat'],
          description:
            'A bodyweight squat standing on the dome of a BOSU ball. Trains balance and the small muscles that protect your knees and ankles.',
          cues: ['Feet hip-width apart on the dome', 'Knees track over your toes', 'Hold something nearby at first'],
        },
        {
          id: 'bosu-split-squat',
          name: 'BOSU Split Squat',
          level: 3,
          target: repsEach(3, 10),
          equipment: ['bosu'],
          alternatives: ['bulgarian-split-squat'],
          description: 'A split squat with your front foot on the BOSU dome. Harder to balance, and great for knee and ankle stability.',
          cues: ['Front foot in the centre of the dome', 'Drop the back knee straight down', 'Stay tall'],
        },
      ],
    },
  ],
};
