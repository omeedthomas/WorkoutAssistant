import { hold, holdEach, reps, repsEach } from '../targets';
import type { TreeDef } from '../types';

export const breakdance: TreeDef = {
  id: 'breakdance',
  name: 'Breakdance',
  tagline: 'Freezes and power moves: baby freeze to airchair, backspins to windmills and flares.',
  color: '#f783ac',
  ultimate: 'continuous-flares',
  kind: 'skill',
  tracks: [
    {
      id: 'baby-freeze',
      name: 'Baby Freeze',
      from: ['frog-stand'],
      steps: [
        {
          id: 'baby-freeze',
          name: 'Baby Freeze',
          level: 3,
          target: holdEach(3, 10),
          description:
            'The first freeze most breakers learn. Plant both hands, stab one elbow into the side of your waist, rest the opposite knee on your other elbow, then tip forward onto the side of your head until your feet float.',
          cues: [
            'Elbow into your hip bone, not your soft stomach',
            'Head rests lightly beside your hand; your arms take the weight',
            'Lean forward to lift your feet, as in a frog stand',
          ],
        },
        {
          id: 'air-baby',
          name: 'Air Baby',
          level: 5,
          target: holdEach(3, 5),
          description:
            'A baby freeze with your head off the floor: balance on one bent arm with that knee resting on its elbow, like a one-arm frog stand.',
          cues: [
            'Lean your shoulder past your hand',
            'Keep the free hand hovering near the floor at first',
            'Spread your fingers and balance through them',
          ],
        },
      ],
    },
    {
      id: 'turtle',
      name: 'Turtle',
      from: ['frog-stand'],
      steps: [
        {
          id: 'turtle-freeze',
          name: 'Turtle Freeze',
          level: 4,
          target: hold(3, 10),
          description:
            'Both elbows dig into your stomach just inside your hips and you balance on your hands with your body flat, like a turtle shell. The base of turtles and airflares.',
          cues: [
            'Elbows close together under your hips',
            'Lean forward until your feet float',
            'Head up, back flat',
          ],
        },
        {
          id: 'turtles',
          name: 'Turtles',
          level: 6,
          target: reps(3, 3),
          description:
            'Spin in a circle in the turtle freeze by hopping your weight from hand to hand. One full rotation counts as one rep.',
          cues: [
            'Shift your weight over one hand before moving the other',
            'Small, quick hand steps',
            'Hips high and feet off the floor the whole way round',
          ],
        },
      ],
    },
    {
      id: 'chair',
      name: 'Chair Freeze to Airchair',
      from: ['baby-freeze'],
      steps: [
        {
          id: 'chair-freeze',
          name: 'Chair Freeze',
          level: 4,
          target: holdEach(3, 10),
          description:
            'Balance on one hand and the side of your head with that elbow stabbed into your lower back, your body arched and your legs crossed in a figure four. Start with your feet on the floor and lift them once the elbow feels set.',
          cues: [
            'Elbow into the back of your waist, under the hip bone',
            'Free hand can steady you at first',
            'Arch your back and push your hips up',
          ],
        },
        {
          id: 'pike-freeze',
          name: 'Pike Freeze',
          level: 6,
          target: holdEach(3, 5),
          requires: ['pike-compression-lift'],
          description:
            'A one-hand freeze. Set your elbow into your hip as in a chair freeze, lift your head off the floor, and hold your legs straight and together, folded at the hips. Hard on the shoulder, so build up slowly.',
          cues: [
            'The elbow in your hip carries your weight',
            'Legs straight and squeezed together',
            'Lower your head to the floor between attempts rather than collapsing',
          ],
        },
        {
          id: 'airchair',
          name: 'Airchair',
          level: 8,
          target: holdEach(3, 5),
          requires: ['handstand-kickup'],
          description:
            'A chair freeze with only one hand on the floor: the elbow is stabbed into your lower back, you face the ceiling, and your head and feet are off the floor.',
          cues: [
            'Set the elbow deep in your lower back before lifting',
            'Push your hips up over your hand',
            'Enter from a chair freeze, lifting your head last',
          ],
        },
      ],
    },
    {
      id: 'head',
      name: 'Headstand to Headspin',
      from: ['plank'],
      steps: [
        {
          id: 'tripod-headstand',
          name: 'Tripod Headstand',
          level: 2,
          target: hold(3, 30),
          description:
            'Head and hands make a triangle on the floor. Rest your knees on your elbows, then lift your legs straight up. The base of headspins, head hollowbacks and many freezes.',
          cues: [
            'Hands and head form a triangle, not a line',
            'Push through your hands so your neck takes less weight',
            'Tuck first, then extend your legs slowly',
          ],
        },
        {
          id: 'tapping-headspin',
          name: 'Tapping Headspin',
          level: 5,
          target: reps(3, 3),
          requires: ['hollow-body-hold'],
          description:
            'Spin on your head while your hands tap the floor around you to push each turn. Wear a beanie or headspin cap on a smooth floor. One full rotation counts as one rep.',
          cues: [
            'Neck strong and stacked under you; stop if it hurts',
            'Body straight, legs in a straddle',
            'Quick, light pushes with your hands',
          ],
        },
        {
          id: 'headspin',
          name: 'Headspin',
          level: 7,
          target: reps(3, 3),
          description:
            'A continuous spin on your head with your hands off the floor and your body straight. Wind up with a few hand taps, then lift your hands.',
          cues: [
            'Squeeze your glutes and core so you spin as one piece',
            'Bring your legs together to spin faster',
            'A sore neck means a rest day',
          ],
        },
      ],
    },
    {
      id: 'hollowback',
      name: 'Hollowback',
      from: ['tripod-headstand'],
      steps: [
        {
          id: 'head-hollowback',
          name: 'Head Hollowback',
          level: 5,
          target: hold(3, 10),
          requires: ['puppy-pose'],
          description:
            'A headstand with your back arched and your legs dropped over behind you, balanced on your head and hands. A safer way to learn the hollowback shape than on your hands.',
          cues: [
            'Push the floor away with your hands',
            'Open your chest as your legs drop back',
            'Bend your knees so your feet hang toward the floor',
          ],
        },
        {
          id: 'hollowback',
          name: 'Hollowback',
          level: 7,
          target: hold(3, 5),
          requires: ['freestanding-handstand'],
          description:
            'A handstand with your back arched like a bridge and your feet hanging over behind you, off the floor. Needs a solid handstand and a mobile upper back.',
          cues: [
            'Push tall through your shoulders',
            'Chest opens forward as your legs drop back',
            'Practise with your feet resting on a wall first',
          ],
        },
      ],
    },
    {
      id: 'windmill',
      name: 'Backspin to Windmill',
      from: ['tuck-hollow-hold'],
      steps: [
        {
          id: 'backspin',
          name: 'Backspin',
          level: 2,
          target: reps(3, 3),
          description:
            'Push off with one leg, roll onto your upper back and pull your knees to your chest to spin. One full rotation counts as one rep.',
          cues: [
            'Spin on your upper back and shoulders, not your lower back',
            'Tuck tight to spin faster',
            'A smooth floor and a sweatshirt make it easier',
          ],
        },
        {
          id: 'baby-mill',
          name: 'Baby Windmill',
          level: 4,
          target: reps(3, 3),
          requires: ['baby-freeze'],
          description:
            'Windmills with your knees tucked, also called munchmills. Roll across your upper back from one baby-freeze shape to the next and keep the rotation going. One full rotation is a rep.',
          cues: [
            'Roll across your shoulders, not your neck',
            'Knees tucked to your chest',
            'Push off the floor with your hands to drive each turn',
          ],
        },
        {
          id: 'windmill',
          name: 'Windmill',
          level: 6,
          target: reps(3, 5),
          description:
            'Roll continuously across your upper back and chest with your legs straight and wide in a V, swinging them around to keep the momentum. The classic power move.',
          cues: [
            'Legs wide and straight, toes pointed',
            'Turn your chest to the floor as you roll through',
            'Push with your hands each time you come round to your chest',
          ],
        },
      ],
    },
    {
      id: 'swipe',
      name: 'Swipe',
      from: ['plank', 'glute-bridge'],
      steps: [
        {
          id: 'swipe',
          name: 'Swipe',
          level: 5,
          target: reps(3, 3),
          description:
            'An explosive spin where your hands and feet swap places: lean back and twist to plant your hands, whip your legs up and around in a big arch, and land back on your feet. One full rotation counts as a rep.',
          cues: [
            'Drive your hips high as your legs leave the floor',
            'Look where you are turning',
            'Practise half swipes onto your hands first',
          ],
        },
      ],
    },
    {
      id: 'flare',
      name: 'Flare',
      from: ['tuck-l-sit', 'pike-compression-lift'],
      steps: [
        {
          id: 'flare-lift',
          name: 'Flare Lift',
          level: 4,
          target: reps(3, 5),
          description:
            'Sit in a wide straddle with your hands on the floor behind your hips. Push through straight arms to lift your hips and legs as high as you can, pause, then lower. This is the back half of a flare.',
          cues: [
            'Arms locked, shoulders pushed down away from your ears',
            'Legs straight and as wide as you can',
            'Hold the top for a second before lowering',
          ],
        },
        {
          id: 'half-flare',
          name: 'Half Flare',
          level: 5,
          target: repsEach(3, 3),
          description:
            'The front half of a flare. From a wide-straddle push-up position, kick one leg high and swing both legs around as you pass your weight from hand to hand, finishing in the flare lift with your hands behind you. Alternate sides.',
          cues: [
            'Kick high in front; height makes the rest easier',
            'Lean back as your legs come round so they clear the floor',
            'Legs straight and wide',
          ],
        },
        {
          id: 'flare',
          name: 'Flare',
          level: 7,
          target: reps(3, 1),
          description:
            'One full flare: your straddled legs circle under and around your body while you pass your weight from hand to hand, without touching the floor.',
          cues: [
            'Push down hard with the supporting arm to keep your hips high',
            'Kick high in front and lean back for the back half',
            'Legs straight and as wide as you can',
          ],
        },
        {
          id: 'continuous-flares',
          name: 'Continuous Flares',
          level: 8,
          target: reps(3, 3),
          description:
            'Flares linked back to back without stopping. Three in a row per set marks a solid, repeatable flare.',
          cues: [
            'Keep a steady rhythm between your hands',
            'Hips stay high on every rotation',
            'End the set when your legs start brushing the floor',
          ],
        },
        {
          id: 'airflare',
          name: 'Airflare',
          level: 10,
          target: reps(3, 1),
          requires: ['turtles'],
          description:
            'A flare tipped up almost to a handstand: you whip around in a V shape, hopping from hand to hand with your body in the air between them. An elite power move built on strong flares.',
          cues: [
            'Drive the rotation from your shoulders',
            'Look at the floor beneath you as you turn',
            'Learn a single hand-to-hand rotation before linking them',
          ],
        },
      ],
    },
    {
      id: 'handspins',
      name: 'Hand Spins',
      from: ['freestanding-handstand'],
      steps: [
        {
          id: 'two-thousand',
          name: '2000',
          level: 7,
          target: reps(3, 2),
          description:
            'A spinning handstand on both hands stacked one on top of the other. Kick in from a turn and keep rotating on the stacked hands. One full rotation is a rep.',
          cues: [
            'Stack one hand on the other and grip',
            'Arms locked, hips over your hands',
            'Kick in with a turn so your body is already spinning',
          ],
        },
        {
          id: 'nineteen-ninety',
          name: '1990',
          level: 9,
          target: reps(3, 2),
          requires: ['straddle-weight-shift'],
          description:
            'The one-hand version of the 2000: a spinning handstand on a single hand. One of the hardest spins in breaking.',
          cues: [
            'Learn the 2000 first; the timing is the same',
            'Lock your arm and stack your shoulder over your hand',
            'Keep your body tight so it spins as one piece',
          ],
        },
      ],
    },
  ],
};
