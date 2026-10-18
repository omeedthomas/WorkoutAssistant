import { hold, reps, repsEach } from '../targets';
import type { TreeDef } from '../types';

export const pull: TreeDef = {
  id: 'pull',
  name: 'Pull',
  tagline: 'From your first dead hang to the one-arm chin-up.',
  color: '#1c7ed6',
  tracks: [
    {
      id: 'pullups',
      name: 'Pull-ups',
      steps: [
        {
          id: 'dead-hang',
          name: 'Dead Hang',
          level: 1,
          target: hold(3, 30),
          description:
            'Hang from a bar with straight arms. Builds grip strength and gets your shoulders used to hanging.',
          cues: [
            'Overhand grip, about shoulder width',
            'Relax your lower body and breathe',
            'Use a box to step up instead of jumping',
          ],
        },
        {
          id: 'scapular-pull',
          name: 'Scapular Pull',
          level: 1,
          target: reps(3, 10),
          description:
            'From a dead hang, pull your shoulder blades down and back without bending your arms. This is how every pull-up starts.',
          cues: [
            'Arms stay straight the whole time',
            'Lift your chest slightly toward the bar',
            'Pause one second at the top',
          ],
        },
        {
          id: 'flexed-arm-hang',
          name: 'Flexed-arm Hang',
          level: 2,
          target: hold(3, 15),
          description:
            'Hold the top of a pull-up with your chin over the bar. Builds strength where most people fail.',
          cues: [
            'Jump or step up into the top position',
            'Chest close to the bar, elbows pulled down',
            "Don't crane your neck to reach the bar",
          ],
        },
        {
          id: 'negative-pullup',
          name: 'Negative Pull-up',
          level: 2,
          target: reps(3, 5),
          requires: ['australian-row'],
          description:
            'Start at the top and lower yourself as slowly as you can. Lowering is the fastest way to build your first pull-up.',
          cues: [
            'Aim for a five-second descent',
            'Stay in control all the way to straight arms',
            'Reset at the top for each rep',
          ],
        },
        {
          id: 'pullup',
          name: 'Pull-up',
          level: 3,
          target: reps(3, 8),
          description: 'Overhand grip, dead hang to chin over the bar. The king of pulling exercises.',
          cues: [
            'Start every rep from straight arms',
            'Drive your elbows down toward your hips',
            'Chin over the bar without kipping',
          ],
        },
        {
          id: 'chest-to-bar-pullup',
          name: 'Chest-to-bar Pull-up',
          level: 4,
          target: reps(3, 6),
          description:
            'Pull high enough that your chest touches the bar. You need this range for muscle-ups.',
          cues: [
            'Lean back slightly as you pull',
            'Pull the bar to your collarbone',
            'Squeeze your shoulder blades together at the top',
          ],
        },
      ],
    },
    {
      id: 'chinups',
      name: 'Chin-ups',
      from: ['negative-pullup'],
      steps: [
        {
          id: 'chinup',
          name: 'Chin-up',
          level: 3,
          target: reps(3, 8),
          description:
            'Underhand grip pull-up. Uses more biceps, and is often the first full rep people get.',
          cues: [
            'Palms facing you, shoulder width apart',
            'Full hang at the bottom',
            'Pull your chest up toward the bar',
          ],
        },
      ],
    },
    {
      id: 'one-arm',
      name: 'One-arm Pulling',
      from: ['pullup'],
      steps: [
        {
          id: 'archer-pullup',
          name: 'Archer Pull-up',
          level: 5,
          target: repsEach(3, 4),
          description:
            'Wide grip. Pull toward one hand while the other arm straightens along the bar.',
          cues: [
            'Assisting arm straightens as you rise',
            'Chin goes over the working hand',
            'Lower slowly to the middle',
          ],
        },
        {
          id: 'one-arm-negative',
          name: 'One-arm Negative',
          level: 7,
          target: repsEach(3, 3),
          requires: ['chinup'],
          description:
            'Get to the top with both arms, let go with one hand, and lower yourself as slowly as you can.',
          cues: [
            'Underhand grip on the working arm',
            'Fight for every inch on the way down',
            'Keep your body from spinning',
          ],
        },
        {
          id: 'one-arm-chinup',
          name: 'One-arm Chin-up',
          level: 9,
          target: repsEach(3, 2),
          description: 'A full chin-up on one arm. Very few people ever get one.',
          cues: [
            'Start from a slightly bent arm until you are stronger',
            'Tense your whole body and squeeze the bar hard',
            'Pull your elbow down to your ribs',
          ],
        },
      ],
    },
    {
      id: 'l-sit-pullup',
      name: 'L-sit Pull-up',
      from: ['pullup', 'l-sit'],
      steps: [
        {
          id: 'l-sit-pullup',
          name: 'L-sit Pull-up',
          level: 5,
          target: reps(3, 6),
          description:
            'Pull-up with your legs held straight out in front. Makes your abs and lats work together.',
          cues: [
            'Legs at hip height the whole set',
            'No swinging; your legs should stay still',
            'Pull the bar toward your chest',
          ],
        },
      ],
    },
    {
      id: 'rows',
      name: 'Rows',
      steps: [
        {
          id: 'incline-row',
          name: 'Incline Row',
          level: 1,
          target: reps(3, 12),
          description:
            'Lean back holding a bar, rings or a sturdy table edge and pull your chest toward your hands. The more upright you stand, the easier it is.',
          cues: [
            'Body straight from head to heels',
            'Pull your hands toward your lower chest',
            'Squeeze your shoulder blades together at the top',
          ],
        },
        {
          id: 'australian-row',
          name: 'Australian Row',
          level: 2,
          target: reps(3, 12),
          description:
            'Horizontal row under a hip-height bar with your heels on the floor. The horizontal partner to the pull-up.',
          cues: [
            'Body almost parallel to the floor',
            'Chest touches the bar',
            "Don't let your hips sag",
          ],
        },
        {
          id: 'feet-elevated-row',
          name: 'Feet-elevated Row',
          level: 3,
          target: reps(3, 10),
          description:
            'Australian row with your feet raised on a box, so you pull more of your bodyweight.',
          cues: [
            'Feet level with the bar or higher',
            'Keep your glutes and abs tight',
            'Pause with your chest at the bar',
          ],
        },
        {
          id: 'archer-row',
          name: 'Archer Row',
          level: 4,
          target: repsEach(3, 6),
          description:
            'Wide-grip row. Pull toward one hand while the other arm straightens out to the side.',
          cues: [
            'Assisting arm stays straight',
            'Pull your chest toward the working hand',
            'Keep your hips level',
          ],
        },
        {
          id: 'one-arm-row',
          name: 'One-arm Row',
          level: 6,
          target: repsEach(3, 5),
          description: 'Inverted row with a single arm. Takes serious strength and control of rotation.',
          cues: [
            'Feet wide for stability',
            'Fight the urge to twist',
            'Start more upright if you need to',
          ],
        },
      ],
    },
  ],
};
