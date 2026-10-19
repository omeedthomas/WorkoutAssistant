import { hold, holdEach, reps } from '../targets';
import type { TreeDef } from '../types';

export const handstand: TreeDef = {
  id: 'handstand',
  name: 'Handstand',
  tagline: 'Balance upside down, then press it: wall work to freestanding handstand push-ups.',
  color: '#ae3ec9',
  ultimate: 'freestanding-hspu',
  tracks: [
    {
      id: 'balance',
      name: 'Handstand',
      from: ['plank'],
      steps: [
        {
          id: 'elevated-pike-hold',
          name: 'Elevated Pike Hold',
          level: 2,
          target: hold(3, 30),
          description:
            'Feet on a box, hands on the floor, hips stacked over your shoulders. Your first taste of supporting weight overhead.',
          cues: [
            'Arms locked by your ears',
            'Push the floor away and shrug up',
            'Walk your hands closer to the box as you improve',
          ],
        },
        {
          id: 'wall-walk',
          name: 'Wall Walk',
          level: 3,
          target: reps(3, 3),
          description:
            'Start in a push-up with your feet against a wall, walk your feet up the wall and your hands toward it, then walk back down.',
          cues: [
            'Small steps with your hands',
            'Keep your body tight like a plank',
            'Stop at a height you can control',
          ],
        },
        {
          id: 'chest-to-wall-handstand',
          name: 'Chest-to-wall Handstand',
          level: 3,
          target: hold(3, 30),
          description:
            'Handstand facing the wall with your hands close to it. Teaches a straight, stacked line.',
          cues: [
            'Hands 10–20 cm from the wall',
            'Ribs in, glutes squeezed',
            'Push tall through your shoulders',
          ],
        },
        {
          id: 'wall-toe-pulls',
          name: 'Wall Toe Pulls',
          level: 4,
          target: reps(3, 5),
          description:
            'In a chest-to-wall handstand, pull your toes off the wall and balance for a moment using only your fingers.',
          cues: [
            'Press your fingertips to stop yourself falling over',
            'Shift your weight from your palms toward your fingers',
            'Hold each balance 3–5 seconds',
          ],
        },
        {
          id: 'handstand-kickup',
          name: 'Handstand Kick-up',
          level: 4,
          target: reps(3, 5),
          description:
            'Kick up into a handstand in open space and find the balance point. Learn to cartwheel out safely first.',
          cues: [
            'Learn the cartwheel bail before anything else',
            'Kick with straight legs, light and controlled',
            'Aim to hover at the top, not slam into it',
          ],
        },
        {
          id: 'freestanding-handstand',
          name: 'Freestanding Handstand',
          level: 5,
          target: hold(3, 15),
          description: 'Hold a straight handstand without a wall. Balance comes from your fingers and wrists.',
          cues: [
            'Fingers spread and gripping the floor',
            'Eyes on the floor between your hands',
            'Small corrections, all from your hands',
          ],
        },
      ],
    },
    {
      id: 'press',
      name: 'Press to Handstand',
      from: ['freestanding-handstand', 'pike-compression-lift'],
      steps: [
        {
          id: 'wall-press',
          name: 'Wall-assisted Press',
          level: 6,
          target: reps(3, 5),
          description:
            'Stand with your back to a wall, hands on the floor, and lift your hips up the wall until your feet float.',
          cues: [
            'Shoulders lean well past your hands',
            'Lift your hips first, then your legs',
            'Compress tight',
          ],
        },
        {
          id: 'press-to-handstand',
          name: 'Press to Handstand',
          level: 8,
          target: reps(3, 3),
          requires: ['l-sit'],
          description:
            'From standing or straddle, press up into a handstand with no jump. A sign of real control.',
          cues: [
            'Lean your shoulders forward as your hips rise',
            'Straddle first; pike comes later',
            'Slow and smooth',
          ],
        },
      ],
    },
    {
      id: 'one-arm',
      name: 'One-arm Handstand',
      from: ['freestanding-handstand'],
      steps: [
        {
          id: 'straddle-weight-shift',
          name: 'Straddle Weight Shift',
          level: 7,
          target: holdEach(3, 10),
          description:
            'In a straddle handstand, shift your weight over one hand until the other is only touching with its fingertips.',
          cues: [
            'Hips shift over the supporting hand',
            'Free hand stays light on its fingertips',
            'Use wide legs as a counterweight',
          ],
        },
        {
          id: 'one-arm-handstand',
          name: 'One-arm Handstand',
          level: 10,
          target: holdEach(3, 5),
          description: 'Balance on a single hand. A long-term goal that takes years of patient practice.',
          cues: [
            'Build a solid 60-second two-arm handstand first',
            'Balance comes from your fingers and wrist',
            'Lift the free hand off slowly',
          ],
        },
      ],
    },
    {
      id: 'hspu',
      name: 'Handstand Push-up',
      from: ['pushup'],
      steps: [
        {
          id: 'pike-pushup',
          name: 'Pike Push-up',
          level: 3,
          target: reps(3, 10),
          description:
            'Hips high in an inverted V. Lower the top of your head toward the floor in front of your hands.',
          cues: [
            'Head and hands form a triangle at the bottom',
            'Elbows track back, not out',
            'Hips stay high',
          ],
        },
        {
          id: 'elevated-pike-pushup',
          name: 'Elevated Pike Push-up',
          level: 4,
          target: reps(3, 8),
          requires: ['elevated-pike-hold'],
          description: 'Pike push-up with your feet on a box, so more of your weight is overhead.',
          cues: [
            'Hips stacked as close to over your hands as you can',
            'Go deep, with your head past your hands',
            'Raise the box as you get stronger',
          ],
        },
        {
          id: 'wall-hspu-negative',
          name: 'Wall HSPU Negative',
          level: 5,
          target: reps(3, 5),
          requires: ['chest-to-wall-handstand'],
          description:
            'Handstand against a wall, then lower your head to the floor as slowly as you can.',
          cues: [
            'Five-second descent',
            'Put a folded mat under your head',
            'Kick back up or come down and reset',
          ],
        },
        {
          id: 'wall-hspu',
          name: 'Wall Handstand Push-up',
          level: 6,
          target: reps(3, 6),
          description: 'A full handstand push-up against a wall.',
          cues: [
            'Hands about shoulder width',
            'Lower your head into the triangle',
            'Press all the way back to locked arms',
          ],
        },
        {
          id: 'freestanding-hspu',
          name: 'Freestanding HSPU',
          level: 8,
          target: reps(3, 3),
          requires: ['freestanding-handstand'],
          description: 'A handstand push-up with no wall: pressing strength plus balance.',
          cues: [
            'Stay stacked through the bottom',
            'Correct your balance with your fingers as you press',
            'Start with partial range',
          ],
        },
      ],
    },
  ],
};
