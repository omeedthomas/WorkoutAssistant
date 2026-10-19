import { hold, reps } from '../targets';
import type { TreeDef } from '../types';

export const planche: TreeDef = {
  id: 'planche',
  name: 'Planche',
  tagline: 'Straight-arm pushing strength, from the lean to the full planche.',
  color: '#e8590c',
  ultimate: 'full-planche',
  kind: 'skill',
  tracks: [
    {
      id: 'frog',
      name: 'Frog Stand',
      from: ['plank'],
      steps: [
        {
          id: 'frog-stand',
          name: 'Frog Stand',
          level: 2,
          target: hold(3, 20),
          description:
            'Squat down, hands on the floor, knees resting on your bent elbows. Lean forward until your feet lift.',
          cues: [
            'Fingers spread and gripping the floor',
            'Lean forward slowly; put a pillow in front of your face',
            'Look slightly ahead',
          ],
        },
        {
          id: 'straight-arm-frog-stand',
          name: 'Straight-arm Frog Stand',
          level: 4,
          target: hold(3, 15),
          description:
            'Frog stand with locked arms and your knees pressing into the outside of your upper arms.',
          cues: [
            'Arms completely straight',
            'Round your upper back (protract)',
            'Lift your hips high',
          ],
        },
      ],
    },
    {
      id: 'planche',
      name: 'Planche',
      from: ['pushup', 'plank'],
      steps: [
        {
          id: 'planche-lean',
          name: 'Planche Lean',
          level: 3,
          target: hold(3, 20),
          description:
            'Top of a push-up, then lean your shoulders forward past your hands. This lean is the base of all planche training.',
          cues: [
            'Arms locked, fingers turned out',
            'Round your upper back and push the floor away',
            'Lean further as you get stronger',
          ],
        },
        {
          id: 'tuck-planche',
          name: 'Tuck Planche',
          level: 5,
          target: hold(3, 10),
          requires: ['straight-arm-frog-stand'],
          description:
            'Balance on straight arms with your knees tucked to your chest and your hips level with your shoulders.',
          cues: [
            'Straight arms, rounded upper back',
            'Hips up to shoulder height',
            'Lean forward until your feet float',
          ],
        },
        {
          id: 'advanced-tuck-planche',
          name: 'Advanced Tuck Planche',
          level: 6,
          target: hold(3, 10),
          description: 'Tuck planche with a flat back and your hips opened away from your chest.',
          cues: ['Back flat, not rounded', 'Knees move away from your chest', 'Push the floor away hard'],
        },
        {
          id: 'straddle-planche',
          name: 'Straddle Planche',
          level: 8,
          target: hold(3, 5),
          description:
            'Planche with straight legs spread wide. Wide legs shorten the lever compared with the full planche.',
          cues: ['Legs wide and locked', 'Hips level with your shoulders', 'Point your toes'],
        },
        {
          id: 'full-planche',
          name: 'Full Planche',
          level: 10,
          target: hold(3, 5),
          description:
            'Body straight and parallel to the floor, held only on your hands. One of the hardest feats in calisthenics.',
          cues: ['Legs together', 'Glutes squeezed, body hollow', 'Lean far past your hands'],
        },
      ],
    },
    {
      id: 'planche-pushups',
      name: 'Planche Push-ups',
      from: ['tuck-planche', 'pseudo-planche-pushup'],
      steps: [
        {
          id: 'tuck-planche-pushup',
          name: 'Tuck Planche Push-up',
          level: 7,
          target: reps(3, 5),
          description: 'Push-ups while holding a tuck planche, without your feet touching down.',
          cues: ['Keep your hips high at the bottom', 'Lean forward as you lower', 'Lock out at the top'],
        },
        {
          id: 'advanced-tuck-planche-pushup',
          name: 'Advanced Tuck Planche Push-up',
          level: 8,
          target: reps(3, 5),
          requires: ['advanced-tuck-planche'],
          description: 'Planche push-ups in the advanced tuck position.',
          cues: ['Keep your back flat', 'Elbows close to your body', 'Control the bottom'],
        },
      ],
    },
  ],
};
