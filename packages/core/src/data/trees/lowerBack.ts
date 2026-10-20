import { holdEach, reps, repsEach } from '../targets';
import type { TreeDef } from '../types';

export const lowerBack: TreeDef = {
  id: 'lower-back',
  name: 'Lower Back',
  tagline: 'Ease a stiff or sore back with gentle mobility, then build the core and hip strength that protects it.',
  color: '#94d82d',
  ultimate: 'kettlebell-swing',
  kind: 'therapy',
  tracks: [
    {
      id: 'spine-mobility',
      name: 'Spine Mobility',
      steps: [
        {
          id: 'cat-cow',
          name: 'Cat-Cow',
          level: 1,
          target: reps(2, 10),
          description:
            'On hands and knees, slowly round your back up toward the ceiling, then let it sag gently as you lift your chest. Moves every part of the spine.',
          cues: ['Move slowly, with your breath', 'Stay in a comfortable range', 'Start the movement from your pelvis'],
        },
        {
          id: 'childs-pose-reach',
          name: "Child's Pose Side Reach",
          level: 1,
          target: holdEach(2, 30),
          description:
            "Sit back on your heels with your arms stretched forward, then walk both hands to one side to stretch along your side and lower back.",
          cues: ['Let your hips sink toward your heels', 'Breathe into the stretched side', 'Gentle, no bouncing'],
        },
        {
          id: 'open-book',
          name: 'Open Book Rotation',
          level: 1,
          target: repsEach(2, 10),
          description:
            'Lying on your side with your knees bent, open your top arm across your body like a book, rotating through your upper back, then close it again.',
          cues: ['Keep your knees together and down', 'Follow your hand with your eyes', 'Rotate from the upper back'],
        },
        {
          id: 'prone-press-up',
          name: 'Prone Press-up',
          level: 1,
          target: reps(3, 10),
          description:
            'Lying face down with hands under your shoulders, press your upper body up while your hips stay on the floor. A classic exercise for back pain that eases with arching.',
          cues: ['Hips stay down, lower back relaxed', 'Only go as high as is comfortable', 'Stop if pain spreads down your leg'],
        },
      ],
    },
    {
      id: 'stability',
      name: 'Core Stability (McGill Big 3)',
      steps: [
        {
          id: 'pelvic-tilt',
          name: 'Pelvic Tilt',
          level: 1,
          target: reps(3, 12),
          description:
            'Lying on your back with knees bent, gently flatten your lower back into the floor by tilting your pelvis, then release. Teaches control of the lower back.',
          cues: ['Small, slow movement', 'Breathe out as you flatten', "Don't push with your legs"],
        },
        {
          id: 'mcgill-curl-up',
          name: 'McGill Curl-up',
          level: 1,
          target: reps(3, 6),
          description:
            'Lying with one knee bent and hands under your lower back, lift your head and shoulders a few centimetres and hold for 10 seconds. Works the abs without bending the spine.',
          cues: ['Hold each rep for 10 seconds', 'Head and neck move as one piece', 'Lift only slightly'],
        },
        {
          id: 'bird-dog',
          name: 'Bird Dog',
          level: 1,
          target: repsEach(3, 8),
          description:
            'On hands and knees, reach one arm forward and the opposite leg back, hold for a few seconds, then return. Builds a stable back and glutes.',
          cues: ['Keep your back flat, like a table', 'Reach long rather than high', 'Hold 5 seconds each rep'],
        },
        {
          id: 'side-plank-knees',
          name: 'Side Plank from the Knees',
          level: 1,
          target: holdEach(3, 20),
          description:
            'Lying on your side propped on your forearm with knees bent, lift your hips so your body forms a straight line from knees to head.',
          cues: ['Elbow under your shoulder', 'Hips pushed forward', 'Graduate to the full side plank in the Core tree'],
        },
      ],
    },
    {
      id: 'hinge',
      name: 'Hip Hinge & Kettlebell',
      from: ['bird-dog'],
      steps: [
        {
          id: 'dowel-hip-hinge',
          name: 'Hip Hinge with a Broomstick',
          level: 1,
          target: reps(3, 10),
          description:
            'Hold a broomstick along your back, touching your head, upper back and tailbone, and bend forward from the hips while it stays in contact. Teaches you to bend without rounding your back.',
          cues: ['Push your hips back, knees soft', 'All three contact points stay on the stick', 'Stand up by squeezing your glutes'],
        },
        {
          id: 'kettlebell-deadlift',
          name: 'Kettlebell Deadlift',
          level: 2,
          target: reps(3, 10),
          equipment: ['kettlebell'],
          alternatives: ['single-leg-rdl'],
          description:
            'With a kettlebell between your feet, hinge at the hips with a flat back, grab it, and stand tall. Strengthens the back and glutes with good technique.',
          cues: ['Flat back, chest proud', 'Push the floor away with your feet', 'Lock out with your glutes, not your back'],
        },
        {
          id: 'single-leg-rdl',
          name: 'Single-leg Romanian Deadlift',
          level: 3,
          target: repsEach(3, 8),
          description:
            'Standing on one leg, hinge forward while the other leg reaches back, keeping your hips level, then stand back up. Hold a weight once bodyweight is easy.',
          cues: ['Hips square to the floor', 'Slight bend in the standing knee', 'Touch a wall for balance at first'],
        },
        {
          id: 'kettlebell-swing',
          name: 'Kettlebell Swing',
          level: 3,
          target: reps(3, 15),
          equipment: ['kettlebell'],
          alternatives: ['single-leg-rdl', 'glute-bridge'],
          description:
            'Hinge to hike a kettlebell between your legs, then snap your hips forward to float it to chest height. Builds powerful hips and a resilient back.',
          cues: ['Power comes from the hips, not the arms', 'Flat back at the bottom', 'Stand tall and squeeze your glutes at the top'],
        },
      ],
    },
    {
      id: 'ball',
      name: 'Exercise Ball',
      from: ['pelvic-tilt'],
      steps: [
        {
          id: 'ball-pelvic-circles',
          name: 'Exercise Ball Pelvic Circles',
          level: 1,
          target: repsEach(2, 10),
          equipment: ['stability-ball'],
          alternatives: ['cat-cow'],
          description:
            'Sitting tall on an exercise ball, roll your hips in slow circles in both directions. A gentle way to loosen a stiff lower back.',
          cues: ['Feet flat, hip-width apart', 'Move only your pelvis', 'Each direction counts as one side'],
        },
        {
          id: 'ball-back-extension',
          name: 'Exercise Ball Back Extension',
          level: 2,
          target: reps(3, 12),
          equipment: ['stability-ball'],
          alternatives: ['prone-ytw', 'bird-dog'],
          description:
            'Lying face down over an exercise ball with feet braced against a wall, lift your chest until your body is straight, then lower slowly.',
          cues: ['Lift to straight, not beyond', 'Squeeze your glutes', 'Hands by your ears or crossed on your chest'],
        },
        {
          id: 'ball-hamstring-curl',
          name: 'Exercise Ball Hamstring Curl',
          level: 3,
          target: reps(3, 10),
          equipment: ['stability-ball'],
          alternatives: ['slider-leg-curl', 'single-leg-glute-bridge'],
          description:
            'Lying on your back with heels on the ball and hips lifted, curl the ball toward you, then roll it back out. Strengthens the hamstrings and glutes that support the back.',
          cues: ['Hips stay up the whole time', 'Slow on the way out', 'Arms out wide for balance'],
        },
      ],
    },
    {
      id: 'anti-rotation',
      name: 'Anti-rotation with Bands',
      from: ['bird-dog'],
      steps: [
        {
          id: 'pallof-press',
          name: 'Pallof Press',
          level: 2,
          target: repsEach(3, 10),
          equipment: ['bands'],
          alternatives: ['side-plank-knees', 'bird-dog'],
          description:
            'Standing side-on to a band anchored at chest height, press it straight out in front of you and resist being pulled round. Trains the core to protect the spine from twisting.',
          cues: ['Stand tall, hips square', 'Press out slowly, hold 2 seconds', "Don't let the band turn you"],
        },
        {
          id: 'pallof-walkout',
          name: 'Pallof Walkout',
          level: 3,
          target: repsEach(3, 8),
          equipment: ['bands'],
          alternatives: ['side-plank'],
          description:
            'Holding the band at your chest with arms extended, side-step away from the anchor and back, staying perfectly square as the pull increases.',
          cues: ['Arms locked out in front', 'Small, controlled steps', 'Body stays square the whole time'],
        },
      ],
    },
  ],
};
