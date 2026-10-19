import { hold, reps } from '../targets';
import type { TreeDef } from '../types';

export const muscleUp: TreeDef = {
  id: 'muscle-up',
  name: 'Muscle-up',
  tagline: 'Pull and dip in one move, on the bar and on rings.',
  color: '#d6336c',
  ultimate: 'strict-bar-muscle-up',
  tracks: [
    {
      id: 'high-pull',
      name: 'Explosive Pulling',
      from: ['chest-to-bar-pullup'],
      steps: [
        {
          id: 'high-pullup',
          name: 'High Pull-up',
          level: 5,
          target: reps(3, 5),
          description:
            'An explosive pull-up that brings the bar down to your lower chest or stomach. This height is what gets you over the bar.',
          cues: [
            'Start with a slight swing (hollow, then arch)',
            'Pull the bar down toward your hips, not just your chin',
            'Fast and powerful',
          ],
        },
      ],
    },
    {
      id: 'bar',
      name: 'Bar Muscle-up',
      from: ['chest-to-bar-pullup', 'straight-bar-dip'],
      steps: [
        {
          id: 'jumping-muscle-up',
          name: 'Jumping Muscle-up',
          level: 5,
          target: reps(3, 5),
          description:
            'Use a low bar or box and jump to help yourself through the transition. Teaches the path over the bar.',
          cues: [
            'Pull your chest toward the bar',
            'Bring your elbows forward quickly at the top',
            'Finish with a full dip lockout',
          ],
        },
        {
          id: 'muscle-up-negative',
          name: 'Muscle-up Negative',
          level: 5,
          target: reps(3, 3),
          description:
            'Start on top of the bar and lower yourself slowly through the transition to a hang.',
          cues: [
            'Keep the bar close to your body',
            'Slow down most at the transition',
            'Finish in a controlled dead hang',
          ],
        },
        {
          id: 'bar-muscle-up',
          name: 'Bar Muscle-up',
          level: 7,
          target: reps(3, 3),
          requires: ['high-pullup'],
          description: 'Pull-up, transition and dip in one fluid motion over the bar.',
          cues: [
            'Pull to your waist, not your chin',
            'Lean over the bar quickly',
            'Press out to locked arms',
          ],
        },
        {
          id: 'strict-bar-muscle-up',
          name: 'Strict Bar Muscle-up',
          level: 8,
          target: reps(3, 2),
          description: 'A bar muscle-up from a dead hang with no swing.',
          cues: ['Start from a still hang', 'Lean back slightly as you pull', 'Slow, controlled transition'],
        },
      ],
    },
    {
      id: 'rings',
      name: 'Ring Muscle-up',
      from: ['dead-hang'],
      steps: [
        {
          id: 'false-grip-hang',
          name: 'False Grip Hang',
          level: 3,
          target: hold(3, 20),
          description:
            'Hang from rings with your wrists bent over the rings. This grip is what makes the ring transition possible.',
          cues: [
            'The ring sits in the crease of your wrist',
            'Keep your wrists bent over the rings',
            'Start with your feet on the floor if you need to',
          ],
        },
        {
          id: 'false-grip-pullup',
          name: 'False Grip Pull-up',
          level: 5,
          target: reps(3, 5),
          requires: ['pullup'],
          description: 'Ring pull-ups while holding the false grip the whole set.',
          cues: ['Pull the rings to your chest', "Don't lose the grip at the bottom", 'Elbows close to your sides'],
        },
        {
          id: 'ring-transition',
          name: 'Low Ring Transition',
          level: 6,
          target: reps(3, 5),
          requires: ['ring-dip'],
          description:
            'With low rings and your feet on the floor, practice rolling from the top of a pull-up into the bottom of a dip.',
          cues: [
            'Keep the rings close to your ribs',
            'Elbows move from beside you to behind you',
            'Use your feet as little as possible',
          ],
        },
        {
          id: 'ring-muscle-up',
          name: 'Ring Muscle-up',
          level: 7,
          target: reps(3, 3),
          description: 'The full ring muscle-up: false grip pull, transition and ring dip.',
          cues: [
            'Pull the rings to your lower chest',
            'Fast elbows through the transition',
            'Turn the rings out at the top',
          ],
        },
      ],
    },
  ],
};
