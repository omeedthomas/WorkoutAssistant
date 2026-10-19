import { hold, holdEach, reps, repsEach } from '../targets';
import type { TreeDef } from '../types';

export const mobility: TreeDef = {
  id: 'mobility',
  name: 'Mobility',
  tagline: 'Loosen tight hamstrings, a stiff upper back and locked-up ankles, a few minutes at a time.',
  color: '#fcc419',
  ultimate: 'full-pike',
  kind: 'therapy',
  tracks: [
    {
      id: 'hamstrings',
      name: 'Hamstring Flexibility',
      steps: [
        {
          id: 'supine-hamstring-stretch',
          name: 'Lying Hamstring Stretch',
          level: 1,
          target: holdEach(2, 30),
          description:
            'Lying on your back, loop a towel around one foot and gently raise the straight leg until you feel a stretch behind the thigh. The safest place to start with tight hamstrings.',
          cues: ['Keep the other leg flat on the floor', 'Knee straight but not locked', 'Breathe out and relax into it'],
        },
        {
          id: 'hamstring-floss',
          name: 'Hamstring Floss',
          level: 1,
          target: repsEach(2, 10),
          description:
            'Lying with one leg raised and held behind the thigh, slowly straighten and bend the knee. Gently mobilises the hamstrings and the nerve that runs behind them.',
          cues: ['Slow and smooth', 'Point and flex the foot as you go', 'Stop short of any tingling'],
        },
        {
          id: 'standing-forward-fold',
          name: 'Standing Forward Fold',
          level: 2,
          target: hold(3, 30),
          description:
            'Stand with feet hip-width apart and fold forward from the hips, letting your arms and head hang. Bend your knees as much as you need to.',
          cues: ['Hinge from the hips', 'Soft knees are fine', 'Let your neck relax'],
        },
        {
          id: 'seated-pike-stretch',
          name: 'Seated Pike Stretch',
          level: 2,
          target: hold(3, 45),
          description:
            'Sitting with legs straight together, reach for your feet with a long back, leading with your chest rather than rounding over.',
          cues: ['Sit on a cushion if your back rounds', 'Chest toward your knees', 'Pull your toes back'],
        },
        {
          id: 'jefferson-curl',
          name: 'Jefferson Curl',
          level: 3,
          target: reps(3, 8),
          alternatives: ['standing-forward-fold'],
          description:
            'Standing on a step, slowly roll down one vertebra at a time with your arms hanging, then roll back up. Add a very light weight only when bodyweight feels easy.',
          cues: ['Very slow: 5 seconds down, 5 up', 'Start without weight', 'Skip it if your back is sore that day'],
        },
        {
          id: 'full-pike',
          name: 'Full Pike Fold',
          level: 4,
          target: hold(3, 30),
          description:
            'Seated with legs straight, fold until your chest rests on your thighs and your hands reach past your feet. The goal for flexible hamstrings.',
          cues: ['Long spine, chest leads', 'Relax and breathe out to go deeper', 'Never force it'],
        },
      ],
    },
    {
      id: 'upper-back',
      name: 'Upper Back & Chest',
      steps: [
        {
          id: 'thread-the-needle',
          name: 'Thread the Needle',
          level: 1,
          target: repsEach(2, 8),
          description:
            'On hands and knees, slide one arm under your body along the floor, rotating your upper back, then open it up toward the ceiling.',
          cues: ['Hips stay over your knees', 'Follow your hand with your eyes', 'Pause at each end'],
        },
        {
          id: 'doorway-pec-stretch',
          name: 'Doorway Chest Stretch',
          level: 1,
          target: holdEach(2, 30),
          description:
            'Place your forearm on a door frame with the elbow at shoulder height, then step through until you feel a stretch across your chest. Helps rounded shoulders.',
          cues: ['Elbow at shoulder height or a little below', "Don't let the shoulder roll forward", 'Gentle stretch only'],
        },
        {
          id: 'foam-roller-thoracic-extension',
          name: 'Thoracic Extension on a Foam Roller',
          level: 1,
          target: reps(2, 10),
          equipment: ['foam-roller'],
          description:
            'Lying with a foam roller across your upper back and hands supporting your head, gently arch back over it, then move it up a few centimetres and repeat.',
          cues: ['Keep it on the upper back, not the lower back', 'Hips stay down', 'Breathe out as you extend'],
        },
        {
          id: 'puppy-pose',
          name: 'Puppy Pose',
          level: 2,
          target: hold(2, 45),
          description:
            'From all fours, walk your hands forward and let your chest sink toward the floor with your hips above your knees. Stretches the shoulders and upper back.',
          cues: ['Hips stay above the knees', 'Arms long', 'Let your chest melt down'],
        },
      ],
    },
    {
      id: 'ankles',
      name: 'Ankles & Calves',
      steps: [
        {
          id: 'wall-calf-stretch',
          name: 'Wall Calf Stretch',
          level: 1,
          target: holdEach(2, 30),
          description:
            'Hands on a wall, step one foot back and press the heel down with the knee straight. Tight calves limit squats and strain the knees.',
          cues: ['Back heel stays down', 'Toes point straight ahead', 'Bend the back knee to stretch lower down'],
        },
        {
          id: 'knee-to-wall',
          name: 'Knee-to-wall Ankle Mobilisation',
          level: 1,
          target: repsEach(2, 10),
          description:
            'Facing a wall with one foot a few centimetres away, drive your knee forward to touch the wall without lifting the heel. Move the foot back as it gets easier.',
          cues: ['Heel stays glued down', 'Knee tracks over the middle toes', 'Measure the distance to track progress'],
        },
      ],
    },
  ],
};
