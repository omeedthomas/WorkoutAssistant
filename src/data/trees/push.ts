import { hold, reps, repsEach, weighted } from '../targets';
import type { TreeDef } from '../types';

export const push: TreeDef = {
  id: 'push',
  name: 'Push',
  tagline: 'Push-ups and dips: the pressing base for almost every skill.',
  color: '#f03e3e',
  ultimate: 'one-arm-pushup',
  tracks: [
    {
      id: 'pushups',
      name: 'Push-ups',
      steps: [
        {
          id: 'wall-pushup',
          name: 'Wall Push-up',
          level: 1,
          target: reps(3, 20),
          description:
            "Stand an arm's length from a wall and press yourself away from it. The gentlest way to learn the push-up pattern.",
          cues: [
            'Hands at chest height, slightly wider than shoulders',
            'Body in one straight line from head to heels',
            'Bring your chest all the way to the wall',
          ],
        },
        {
          id: 'incline-pushup',
          name: 'Incline Push-up',
          level: 1,
          target: reps(3, 15),
          description:
            'Push-up with your hands on a counter, table or bench. The lower the surface, the harder it gets.',
          cues: [
            'Start on a high surface and work down to a low bench',
            "Squeeze your glutes so your hips don't sag",
            'Elbows about 45° from your body',
          ],
        },
        {
          id: 'knee-pushup',
          name: 'Knee Push-up',
          level: 2,
          target: reps(3, 15),
          description:
            'A full-range push-up from the floor with your knees down, which reduces the load you press.',
          cues: [
            'Straight line from knees to head',
            'Chest touches the floor every rep',
            'Lock your elbows out fully at the top',
          ],
        },
        {
          id: 'pushup',
          name: 'Push-up',
          level: 3,
          target: reps(3, 12),
          description: 'The classic: a full plank, chest to the floor, full lockout.',
          cues: [
            'Hands under shoulders, fingers spread',
            'Ribs down and glutes tight, like a moving plank',
            'Chest to the floor every rep',
            'Push the floor away at the top',
          ],
        },
        {
          id: 'diamond-pushup',
          name: 'Diamond Push-up',
          level: 4,
          target: reps(3, 10),
          description:
            'Hands together under your chest, forming a diamond. Shifts the load to the triceps and builds lockout strength.',
          cues: [
            'Thumbs and index fingers touch',
            'Elbows track back, not out',
            'Lower until your chest meets your hands',
          ],
        },
        {
          id: 'archer-pushup',
          name: 'Archer Push-up',
          level: 5,
          target: repsEach(3, 6),
          description:
            'Very wide hands. Shift your weight onto one arm as you lower while the other arm stays straight. This is the bridge to one-arm push-ups.',
          cues: [
            'Assisting arm stays straight and does as little as possible',
            'Working elbow stays close to your side',
            'Keep your shoulders level with the floor',
          ],
        },
        {
          id: 'incline-one-arm-pushup',
          name: 'Incline One-arm Push-up',
          level: 6,
          target: repsEach(3, 6),
          description:
            'One-arm push-up with your hand on a bench or box. Lower the incline as you get stronger.',
          cues: [
            'Feet wider than shoulders for balance',
            'Free hand behind your back',
            'Resist twisting; hips stay square to the floor',
          ],
        },
        {
          id: 'one-arm-pushup',
          name: 'One-arm Push-up',
          level: 8,
          target: repsEach(3, 5),
          description:
            'A full one-arm push-up from the floor: pressing strength, anti-rotation and full-body tension in a single rep.',
          cues: [
            'Wide stance, working hand under your chest',
            'Brace hard so nothing twists',
            'Lower your chest to fist height',
          ],
        },
      ],
    },
    {
      id: 'decline',
      name: 'Decline & Pseudo Planche',
      from: ['pushup'],
      steps: [
        {
          id: 'decline-pushup',
          name: 'Decline Push-up',
          level: 4,
          target: reps(3, 12),
          description:
            'Feet raised on a bench or step. Puts more of your bodyweight through your hands and works the upper chest and shoulders.',
          cues: [
            'Start with a low step, then raise it',
            "Don't let your hips pike up",
            'Keep your head neutral and look slightly ahead',
          ],
        },
        {
          id: 'pseudo-planche-pushup',
          name: 'Pseudo Planche Push-up',
          level: 6,
          target: reps(3, 8),
          requires: ['planche-lean'],
          description:
            'A push-up with your hands turned out by your hips and your shoulders leaning well past your hands. Builds straight-arm planche strength.',
          cues: [
            'Fingers point out or back, hands by your lower ribs',
            'Keep the lean the whole set, not just at the top',
            'Protract hard at the top and keep a hollow body',
          ],
        },
      ],
    },
    {
      id: 'explosive',
      name: 'Explosive Push-ups',
      from: ['pushup'],
      steps: [
        {
          id: 'explosive-pushup',
          name: 'Explosive Push-up',
          level: 4,
          target: reps(3, 8),
          description:
            'Press hard enough that your hands leave the floor. Builds the power you need for clap push-ups and muscle-ups.',
          cues: [
            'Lower under control, then push as fast as you can',
            'Land with soft elbows',
            'Stop the set when the reps slow down',
          ],
        },
        {
          id: 'clap-pushup',
          name: 'Clap Push-up',
          level: 5,
          target: reps(3, 6),
          description: 'Explode off the floor and clap before you catch yourself.',
          cues: [
            'Keep your body rigid in the air',
            'Clap quickly and get your hands back under your shoulders',
            'Stop if your form breaks down; this is about quality reps',
          ],
        },
      ],
    },
    {
      id: 'dips',
      name: 'Dips',
      steps: [
        {
          id: 'bench-dip',
          name: 'Bench Dip',
          level: 1,
          target: reps(3, 15),
          description:
            'Hands on a bench behind you, feet on the floor. Bend and straighten your arms to build triceps and shoulder extension.',
          cues: [
            'Shoulders down and away from your ears',
            'Lower until your upper arms are about parallel',
            'Bend your knees to make it easier, straighten your legs to make it harder',
          ],
        },
        {
          id: 'dip-support-hold',
          name: 'Support Hold',
          level: 2,
          target: hold(3, 30),
          description:
            'Hold yourself up on parallel bars (or two sturdy chairs) with locked arms. This is the top position of every dip.',
          cues: [
            'Arms locked, shoulders pushed down',
            'Chest proud, body slightly hollow',
            "Don't let your shoulders shrug up",
          ],
        },
        {
          id: 'negative-dip',
          name: 'Negative Dip',
          level: 3,
          target: reps(3, 5),
          description:
            'Start at the top and take five seconds to lower to the bottom of a dip. Step back up and repeat.',
          cues: [
            'Count a slow five seconds on the way down',
            'Lean slightly forward',
            'Lower until your shoulders are just below your elbows',
          ],
        },
        {
          id: 'dip',
          name: 'Parallel Bar Dip',
          level: 4,
          target: reps(3, 10),
          description: 'A full dip on parallel bars: one of the best upper-body strength builders.',
          cues: [
            'Full depth: shoulders below elbows',
            'Full lockout at the top',
            'Elbows track back, not out',
          ],
        },
        {
          id: 'straight-bar-dip',
          name: 'Straight Bar Dip',
          level: 5,
          target: reps(3, 8),
          description:
            'A dip on top of a single bar. This is the finishing half of the bar muscle-up.',
          cues: [
            'Lean your chest over the bar',
            'Bar touches your upper stomach at the bottom',
            'Legs slightly in front to counterbalance',
          ],
        },
      ],
    },
    {
      id: 'ring-dips',
      name: 'Ring Dips',
      from: ['dip'],
      steps: [
        {
          id: 'ring-support-hold',
          name: 'Ring Support Hold',
          level: 5,
          target: hold(3, 30),
          description:
            'Support hold on gymnastic rings. The rings shake, so your stabilizers have to work hard.',
          cues: [
            'Rings pressed close to your sides',
            'Turn the rings out slightly (thumbs away from you)',
            'Arms fully locked',
          ],
        },
        {
          id: 'ring-dip',
          name: 'Ring Dip',
          level: 6,
          target: reps(3, 8),
          description:
            'A full dip on rings: harder than bars because you have to control the rings through the whole rep.',
          cues: [
            'Keep the rings close to your body the whole rep',
            'Turn the rings out at the top',
            'Go slow until it stops shaking',
          ],
        },
      ],
    },
    {
      id: 'weighted-pushups',
      name: 'Weighted Push-ups',
      from: ['pushup'],
      steps: [
        {
          id: 'weighted-pushup',
          name: 'Weighted Push-up',
          level: 5,
          target: weighted(3, 8, 20),
          description:
            'Push-ups with a weight vest, a backpack or a plate on your upper back. Log the added weight and add a little each time you complete the plan.',
          cues: [
            'Load sits high on your back, between the shoulder blades',
            'Same strict form as a bodyweight push-up: chest to the floor, full lockout',
            'Squeeze your glutes so the weight does not sag your hips',
          ],
        },
      ],
    },
    {
      id: 'weighted-dips',
      name: 'Weighted Dips',
      from: ['dip'],
      steps: [
        {
          id: 'weighted-dip',
          name: 'Weighted Dip',
          level: 6,
          target: weighted(3, 6, 20),
          description:
            'Parallel bar dips with a dip belt, vest or a dumbbell held between your feet. One of the best ways to build pressing strength once bodyweight dips are easy.',
          cues: [
            'Full depth only as far as your shoulders stay comfortable',
            'Keep the weight still: no swinging',
            'Lock out fully at the top of every rep',
          ],
        },
      ],
    },
  ],
};
