import { holdEach, reps, repsEach } from '../targets';
import type { TreeDef } from '../types';

export const shoulder: TreeDef = {
  id: 'shoulder',
  name: 'Shoulder Rehab',
  tagline: 'Calm, strong, stable shoulders: shoulder-blade control and rotator cuff work, gentle to strong.',
  color: '#5c7cfa',
  ultimate: 'turkish-get-up',
  kind: 'therapy',
  tracks: [
    {
      id: 'scapular',
      name: 'Shoulder Blade Control',
      steps: [
        {
          id: 'scap-squeeze',
          name: 'Shoulder Blade Squeeze',
          level: 1,
          target: reps(3, 12),
          description:
            'Sitting or standing tall, draw your shoulder blades back and slightly down, hold for 3 seconds, then relax. Wakes up the muscles that hold your shoulder in a good position.',
          cues: ['Hold each squeeze for 3 seconds', 'Shoulders down, away from your ears', "Don't arch your lower back"],
        },
        {
          id: 'wall-angel',
          name: 'Wall Angel',
          level: 1,
          target: reps(3, 10),
          description:
            'Stand with your back against a wall and slide your arms up and down it like a snow angel, keeping as much contact as you comfortably can.',
          cues: ['Ribs down, lower back gently against the wall', 'Only go as high as you can without pain', 'Move slowly, 3 seconds each way'],
        },
        {
          id: 'prone-ytw',
          name: 'Prone Y-T-W Raise',
          level: 2,
          target: reps(3, 8),
          description:
            'Lying face down, lift your arms into a Y, then a T, then a W shape, squeezing your shoulder blades each time. One Y-T-W is one rep.',
          cues: ['Thumbs up toward the ceiling', 'Lift from the shoulder blades, not the lower back', 'Pause for 2 seconds at the top'],
        },
        {
          id: 'pt-scap-pushup',
          name: 'Scapular Push-up',
          level: 2,
          target: reps(3, 12),
          description:
            'In a plank (or on your knees), keep your arms straight and let your shoulder blades sink together, then push the floor away to spread them apart. Trains the serratus, a key shoulder stabiliser.',
          cues: ['Arms stay straight the whole time', 'Push the floor away at the top', 'Start from your knees if needed'],
        },
      ],
    },
    {
      id: 'cuff-bands',
      name: 'Rotator Cuff with Bands',
      steps: [
        {
          id: 'isometric-external-rotation',
          name: 'Isometric External Rotation',
          level: 1,
          target: holdEach(3, 20),
          description:
            'Stand side-on to a door frame with your elbow bent at 90°, and press the back of your wrist gently into the frame without moving. A pain-free way to start loading the rotator cuff.',
          cues: ['Elbow tucked against your side (a rolled towel helps)', 'Press at about half effort', 'Breathe normally'],
        },
        {
          id: 'band-external-rotation',
          name: 'Band External Rotation',
          level: 1,
          target: repsEach(3, 15),
          equipment: ['bands'],
          alternatives: ['side-lying-external-rotation'],
          description:
            'Elbow at your side and bent to 90°, rotate your forearm outward against a band anchored at elbow height, then return slowly.',
          cues: ['Keep the elbow pinned to your side', 'Slow on the way back (3 seconds)', 'Light band: no pain, no shrugging'],
        },
        {
          id: 'band-internal-rotation',
          name: 'Band Internal Rotation',
          level: 1,
          target: repsEach(3, 15),
          equipment: ['bands'],
          alternatives: ['isometric-external-rotation'],
          description:
            'The mirror of the external rotation: band anchored to your side, rotate your forearm in across your stomach and back out under control.',
          cues: ['Elbow stays at your side', 'Stand tall, no twisting', 'Control the return'],
        },
        {
          id: 'band-pull-apart',
          name: 'Band Pull-apart',
          level: 2,
          target: reps(3, 15),
          equipment: ['bands'],
          alternatives: ['prone-ytw'],
          description:
            'Hold a band in front of you at shoulder height and pull it apart until it touches your chest, squeezing your shoulder blades together.',
          cues: ['Arms nearly straight', 'Shoulders down, not up by your ears', 'Pause and squeeze at the end'],
        },
        {
          id: 'band-face-pull',
          name: 'Band Face Pull',
          level: 2,
          target: reps(3, 15),
          equipment: ['bands'],
          alternatives: ['prone-ytw', 'australian-row'],
          description:
            'Pull a band anchored at head height toward your face, elbows high, finishing with your hands beside your ears. Great for posture and the back of the shoulder.',
          cues: ['Elbows high and wide', 'Rotate your hands back at the end', "Don't lean back"],
        },
        {
          id: 'band-external-rotation-90',
          name: 'Band External Rotation at 90°',
          level: 3,
          target: repsEach(3, 12),
          equipment: ['bands'],
          alternatives: ['cuban-rotation'],
          description:
            'Arm out to the side at shoulder height with the elbow bent to 90°, rotate your forearm up against a band until it points to the ceiling. Builds overhead shoulder control.',
          cues: ['Elbow stays level with your shoulder', 'Slow and controlled', 'Only rotate as far as is comfortable'],
        },
      ],
    },
    {
      id: 'cuff-dumbbells',
      name: 'Rotator Cuff with Dumbbells',
      from: ['scap-squeeze'],
      steps: [
        {
          id: 'side-lying-external-rotation',
          name: 'Side-lying External Rotation',
          level: 2,
          target: repsEach(3, 12),
          equipment: ['dumbbells'],
          alternatives: ['band-external-rotation'],
          description:
            'Lying on your side with a light dumbbell in your top hand and a towel under that elbow, rotate the weight up toward the ceiling and lower it slowly.',
          cues: ['Start very light (1–2 kg / 2–5 lb)', 'Elbow stays on the towel', '3 seconds down'],
        },
        {
          id: 'prone-t-raise',
          name: 'Prone T Raise',
          level: 2,
          target: reps(3, 12),
          equipment: ['dumbbells'],
          alternatives: ['prone-ytw'],
          description:
            'Lying face down on a bench or bent over, raise light dumbbells straight out to the sides into a T, thumbs up, and lower with control.',
          cues: ['Thumbs point up', 'Squeeze your shoulder blades together', 'Light weight, perfect form'],
        },
        {
          id: 'scaption-raise',
          name: 'Scaption Raise',
          level: 3,
          target: reps(3, 12),
          equipment: ['dumbbells'],
          alternatives: ['wall-angel'],
          description:
            'Raise light dumbbells up and slightly forward (in a V, about 30° in front of your body) to shoulder height, thumbs up. Strengthens the shoulder in its most natural lifting path.',
          cues: ['Thumbs up, arms in a V', 'Stop at shoulder height', "Don't shrug"],
        },
        {
          id: 'cuban-rotation',
          name: 'Cuban Rotation',
          level: 4,
          target: reps(3, 10),
          equipment: ['dumbbells'],
          alternatives: ['band-external-rotation-90'],
          description:
            'Raise your elbows out to shoulder height (an upright row), rotate your forearms up until the weights are above your elbows, then reverse. A classic shoulder-health exercise.',
          cues: ['Very light weights', 'Elbows stay at shoulder height while you rotate', 'Smooth, no swinging'],
        },
      ],
    },
    {
      id: 'kettlebell',
      name: 'Overhead Stability with a Kettlebell',
      from: ['wall-angel'],
      steps: [
        {
          id: 'kettlebell-halo',
          name: 'Kettlebell Halo',
          level: 2,
          target: repsEach(3, 8),
          equipment: ['kettlebell'],
          alternatives: ['wall-angel'],
          description:
            'Hold a light kettlebell upside down by the horns and circle it around your head, close to your neck, in both directions. Gently mobilises the shoulders.',
          cues: ['Keep it close to your head', 'Ribs down, glutes squeezed', 'Each direction counts as one side'],
        },
        {
          id: 'bottoms-up-hold',
          name: 'Bottoms-up Kettlebell Hold',
          level: 3,
          target: holdEach(3, 20),
          equipment: ['kettlebell'],
          alternatives: ['band-external-rotation-90'],
          description:
            'Hold a light kettlebell upside down (bell above your hand) at shoulder height, elbow under the wrist. The wobble trains the rotator cuff to stabilise the joint.',
          cues: ['Crush the handle', 'Wrist straight, elbow under the bell', 'Start with a light bell'],
        },
        {
          id: 'kettlebell-waiters-walk',
          name: "Waiter's Walk",
          level: 3,
          target: holdEach(3, 30),
          equipment: ['kettlebell'],
          alternatives: ['bottoms-up-hold'],
          description:
            'Press a kettlebell overhead and walk slowly, holding it there with the arm locked out like a waiter carrying a tray.',
          cues: ['Bicep by your ear, arm straight', 'Ribs down, no leaning', 'Walk slowly and steadily'],
        },
        {
          id: 'turkish-get-up',
          name: 'Turkish Get-up',
          level: 4,
          target: repsEach(3, 3),
          equipment: ['kettlebell'],
          alternatives: ['kettlebell-waiters-walk'],
          description:
            'Holding a kettlebell overhead, stand up from lying on your back, step by step, then reverse back down. The ultimate test of a strong, stable shoulder.',
          cues: ['Eyes on the bell the whole time', 'Learn it with a shoe balanced on your fist first', 'Slow and deliberate, each step a pause'],
        },
      ],
    },
    {
      id: 'ball',
      name: 'Exercise Ball Stability',
      from: ['pt-scap-pushup'],
      steps: [
        {
          id: 'ball-wall-circles',
          name: 'Ball Wall Circles',
          level: 2,
          target: repsEach(3, 10),
          equipment: ['stability-ball'],
          alternatives: ['wall-angel'],
          description:
            'Press an exercise ball against a wall with one straight arm at shoulder height and make small circles in both directions. Builds shoulder stability with gentle load.',
          cues: ['Keep steady pressure into the ball', 'Small, controlled circles', 'Shoulder down and back'],
        },
        {
          id: 'ball-prone-ytw',
          name: 'Y-T-W on an Exercise Ball',
          level: 3,
          target: reps(3, 8),
          equipment: ['stability-ball'],
          alternatives: ['prone-ytw', 'prone-t-raise'],
          description:
            'Lying face down over an exercise ball, raise your arms into Y, T and W shapes. The ball lets your arms move through a bigger range than the floor.',
          cues: ['Chest on the ball, feet wide for balance', 'Thumbs up', 'Pause at each letter'],
        },
      ],
    },
  ],
};
