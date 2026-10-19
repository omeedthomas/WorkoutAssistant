import { hold, holdEach, reps, repsEach } from '../targets';
import type { TreeDef } from '../types';

export const core: TreeDef = {
  id: 'core',
  name: 'Core',
  tagline: 'Hollow body, leg raises, L-sits and dragon flags: the tension behind every skill.',
  color: '#b8860b',
  ultimate: 'dragon-flag',
  tracks: [
    {
      id: 'hollow',
      name: 'Hollow Body',
      steps: [
        {
          id: 'dead-bug',
          name: 'Dead Bug',
          level: 1,
          target: repsEach(3, 10),
          description:
            'Lying on your back, slowly reach the opposite arm and leg out while keeping your lower back on the floor.',
          cues: [
            'Press your lower back into the floor',
            'Move slowly and breathe out as you extend',
            "Only go as far as you can without your back arching",
          ],
        },
        {
          id: 'tuck-hollow-hold',
          name: 'Tuck Hollow Hold',
          level: 1,
          target: hold(3, 20),
          description:
            'Shoulders off the floor, knees pulled in, lower back pressed down. The easiest version of the hollow body.',
          cues: [
            'Lower back stays glued to the floor',
            'Chin tucked slightly',
            'Reach your arms toward your feet',
          ],
        },
        {
          id: 'hollow-body-hold',
          name: 'Hollow Body Hold',
          level: 2,
          target: hold(3, 30),
          description:
            'Arms overhead, legs straight and just off the floor, lower back flat. This is the body shape used in pull-ups, levers and handstands.',
          cues: [
            'Lower back pressed down; raise your legs if it lifts',
            'Squeeze your legs together and point your toes',
            'Arms by your ears',
          ],
        },
        {
          id: 'hollow-rock',
          name: 'Hollow Body Rock',
          level: 3,
          target: reps(3, 15),
          description:
            'Hold the hollow shape and rock back and forth without losing it.',
          cues: [
            'The shape stays fixed and your whole body rocks',
            'Lead with your arms and legs together',
            'Stop the set if your lower back lifts',
          ],
        },
      ],
    },
    {
      id: 'plank',
      name: 'Planks',
      steps: [
        {
          id: 'plank',
          name: 'Plank',
          level: 1,
          target: hold(3, 45),
          description: 'Forearm plank with a straight body. Teaches your trunk to stay rigid.',
          cues: [
            'Elbows under shoulders',
            'Squeeze your glutes and tuck your pelvis slightly',
            "Don't hold your breath",
          ],
        },
        {
          id: 'side-plank',
          name: 'Side Plank',
          level: 2,
          target: holdEach(3, 30),
          description:
            'A plank on one forearm, facing sideways. Builds the side-body strength the human flag needs.',
          cues: [
            'Hips high in a straight line',
            'Stack your feet, or stagger them to make it easier',
            'Top arm on your hip or reaching up',
          ],
        },
      ],
    },
    {
      id: 'rollout',
      name: 'Ab Rollouts',
      from: ['plank'],
      steps: [
        {
          id: 'kneeling-ab-rollout',
          name: 'Kneeling Ab Rollout',
          level: 3,
          target: reps(3, 10),
          description:
            'Kneeling with an ab wheel or barbell, roll out as far as you can control and pull back in.',
          cues: [
            'Tuck your pelvis; never let your back arch',
            'Only roll as far as you can return from',
            'Pull back with your abs, not your hips',
          ],
        },
        {
          id: 'wall-ab-rollout',
          name: 'Standing Rollout to Wall',
          level: 5,
          target: reps(3, 6),
          description:
            'Standing rollout where the wheel stops against a wall. Start close to the wall and move further away over time.',
          cues: [
            'Arms straight, hips tucked',
            'Let the wall stop you, then pull back',
            'Increase the distance a little at a time',
          ],
        },
        {
          id: 'standing-ab-rollout',
          name: 'Standing Ab Rollout',
          level: 7,
          target: reps(3, 5),
          description: 'A full rollout from standing to nearly flat, and back up again.',
          cues: ['Body hollow throughout', 'Control the bottom position', 'Exhale on the way back up'],
        },
      ],
    },
    {
      id: 'leg-raises',
      name: 'Leg Raises',
      from: ['dead-bug'],
      steps: [
        {
          id: 'lying-leg-raise',
          name: 'Lying Leg Raise',
          level: 1,
          target: reps(3, 12),
          description:
            'On your back, raise straight legs to vertical and lower them slowly without your back arching.',
          cues: [
            'Hands under your hips if you need support',
            'Lower slowly, about three seconds',
            'Bend your knees slightly to make it easier',
          ],
        },
        {
          id: 'hanging-knee-raise',
          name: 'Hanging Knee Raise',
          level: 2,
          target: reps(3, 12),
          requires: ['dead-hang'],
          description: 'Hang from a bar and pull your knees up to your chest without swinging.',
          cues: [
            'Shoulders engaged, not just hanging loose',
            'Curl your pelvis up at the top',
            'Lower under control so you stop swinging',
          ],
        },
        {
          id: 'hanging-leg-raise',
          name: 'Hanging Leg Raise',
          level: 3,
          target: reps(3, 10),
          description: 'Raise straight legs to hip height or higher while hanging.',
          cues: ['Legs straight, toes pointed', 'No kipping', 'Pause briefly at the top'],
        },
        {
          id: 'toes-to-bar',
          name: 'Toes to Bar',
          level: 4,
          target: reps(3, 10),
          description: 'Strict hanging leg raise all the way until your toes touch the bar.',
          cues: [
            'Push down on the bar with straight arms',
            'Roll your hips up and back',
            'Lower slowly',
          ],
        },
        {
          id: 'windshield-wiper',
          name: 'Windshield Wipers',
          level: 6,
          target: repsEach(3, 6),
          description:
            'From toes to bar, rotate your legs from side to side like a windshield wiper. Hard work for your obliques.',
          cues: [
            'Keep your legs together and straight',
            'Control the rotation; no swinging',
            'Start with smaller arcs',
          ],
        },
      ],
    },
    {
      id: 'compression',
      name: 'Compression',
      from: ['lying-leg-raise'],
      steps: [
        {
          id: 'seated-leg-lift',
          name: 'Seated Leg Lift',
          level: 2,
          target: repsEach(3, 10),
          description:
            'Sit with straight legs and lift one leg off the floor using your hip flexors. Builds the compression needed for L-sits and presses.',
          cues: [
            'Sit tall with hands beside your knees',
            'Keep the leg straight and lift your heel',
            'Pause one second at the top',
          ],
        },
        {
          id: 'pike-compression-lift',
          name: 'Pike Compression Lift',
          level: 3,
          target: reps(3, 10),
          description:
            'Seated pike with your hands by your knees. Lift both legs off the floor and hold briefly.',
          cues: [
            'Lean forward over your legs',
            'Lock your knees',
            'Lift your heels, even just a little',
          ],
        },
      ],
    },
    {
      id: 'l-sit',
      name: 'L-sit',
      from: ['tuck-hollow-hold'],
      steps: [
        {
          id: 'foot-supported-l-sit',
          name: 'Foot-supported L-sit',
          level: 2,
          target: hold(3, 20),
          description:
            'Hands on the floor or parallettes by your hips, push your hips up while your heels stay on the floor.',
          cues: [
            'Arms locked straight',
            'Push the floor away and lift your hips',
            'Shoulders down, chest up',
          ],
        },
        {
          id: 'tuck-l-sit',
          name: 'Tuck L-sit',
          level: 3,
          target: hold(3, 15),
          requires: ['dip-support-hold'],
          description: 'Support your whole body on your hands with your knees tucked to your chest.',
          cues: [
            'Push down hard through your shoulders',
            'Knees high, feet off the floor',
            'Parallettes make it easier to start',
          ],
        },
        {
          id: 'one-leg-l-sit',
          name: 'One-leg L-sit',
          level: 4,
          target: holdEach(3, 10),
          description: 'Tuck L-sit with one leg extended straight out.',
          cues: ['Extended leg locked straight', 'Alternate legs each set', 'Keep your hips level'],
        },
        {
          id: 'l-sit',
          name: 'L-sit',
          level: 5,
          target: hold(3, 15),
          requires: ['pike-compression-lift'],
          description:
            'Both legs straight and level with your hips, held entirely on your hands. A real test of strength and compression.',
          cues: [
            'Legs locked, toes pointed',
            'Push down and lean slightly forward',
            'Lift your legs to hip height',
          ],
        },
        {
          id: 'v-sit',
          name: 'V-sit',
          level: 8,
          target: hold(3, 5),
          description:
            'Lift your legs well above horizontal, toward your face. Takes extreme compression and shoulder strength.',
          cues: [
            'Lean back and push your hips forward',
            'Pull your legs up with your hip flexors',
            'Hands slightly behind your hips',
          ],
        },
      ],
    },
    {
      id: 'dragon-flag',
      name: 'Dragon Flag',
      from: ['hollow-rock', 'lying-leg-raise'],
      steps: [
        {
          id: 'tuck-dragon-flag',
          name: 'Tuck Dragon Flag',
          level: 4,
          target: reps(3, 5),
          description:
            'Lying on a bench, grip behind your head and raise your body onto your shoulders with knees tucked, then lower slowly.',
          cues: [
            'Weight on your upper back, never your neck',
            'Hips stay extended; no piking',
            'Lower slowly',
          ],
        },
        {
          id: 'dragon-flag-negative',
          name: 'Dragon Flag Negative',
          level: 5,
          target: reps(3, 5),
          description: 'Get into the top position and lower a straight body as slowly as you can.',
          cues: ['Body in one straight line', 'Aim for a five-second descent', 'Stop when your hips break'],
        },
        {
          id: 'dragon-flag',
          name: 'Dragon Flag',
          level: 7,
          target: reps(3, 5),
          description:
            "The full dragon flag: lower and raise a rigid body with only your shoulders on the bench.",
          cues: [
            'Squeeze your glutes to keep your hips straight',
            'Control both the lowering and the raising',
            'Keep your chin tucked',
          ],
        },
      ],
    },
  ],
};
