import { hold, holdEach, repsEach } from '../targets';
import type { TreeDef } from '../types';

export const hips: TreeDef = {
  id: 'hips',
  name: 'Hips',
  tagline: 'Loosen stiff hips and build the strength to keep them moving freely.',
  color: '#845ef7',
  ultimate: 'cossack-squat',
  kind: 'therapy',
  tracks: [
    {
      id: 'hip-flexors',
      name: 'Hip Flexor Release',
      steps: [
        {
          id: 'kneeling-hip-flexor-stretch',
          name: 'Kneeling Hip Flexor Stretch',
          level: 1,
          target: holdEach(2, 30),
          description:
            'Kneel on one knee with the other foot in front, tuck your tailbone under and shift forward until you feel a stretch at the front of the back hip. Undoes hours of sitting.',
          cues: ['Squeeze the glute of the kneeling leg', "Tuck your pelvis under; don't arch", 'Pad the knee with a towel'],
        },
        {
          id: 'couch-stretch',
          name: 'Couch Stretch',
          level: 2,
          target: holdEach(2, 45),
          description:
            'With one knee on the floor against a couch or wall and that shin running up it, bring the other foot forward and lift your chest. A deeper stretch for the hip flexors and quads.',
          cues: ['Start with your chest leaning forward', 'Squeeze the back glute', 'Back off if the knee complains'],
        },
      ],
    },
    {
      id: 'rotation',
      name: 'Hip Rotation',
      steps: [
        {
          id: 'figure-four-stretch',
          name: 'Figure-four Stretch',
          level: 1,
          target: holdEach(2, 30),
          description:
            'Lying on your back, cross one ankle over the opposite knee and pull that thigh toward you. Stretches the deep hip rotators and glutes.',
          cues: ['Flex the foot of the crossed leg', 'Keep your head and shoulders relaxed', 'Gentle pull, steady breathing'],
        },
        {
          id: 'ninety-ninety-switch',
          name: '90/90 Hip Switch',
          level: 1,
          target: repsEach(2, 8),
          description:
            'Sitting with both knees bent to 90°, one leg in front and one to the side, rotate both knees over to the other side and back. Works both kinds of hip rotation.',
          cues: ['Use your hands behind you at first', 'Move slowly through the middle', 'Sit tall as it gets easier'],
        },
        {
          id: 'pigeon-stretch',
          name: 'Pigeon Stretch',
          level: 2,
          target: holdEach(2, 45),
          description:
            'From all fours, bring one knee forward with the shin angled across, extend the other leg back, and settle your hips down. A deep glute and hip stretch.',
          cues: ['Hips square, not tipped to one side', 'Prop your hip on a cushion if needed', 'Fold forward only if it feels good'],
        },
        {
          id: 'hip-cars',
          name: 'Hip CARs',
          level: 2,
          target: repsEach(2, 5),
          description:
            'On hands and knees (or standing), draw the biggest, slowest circle you can with one knee, moving only at the hip. Controlled articular rotations keep the joint healthy.',
          cues: ['Keep the rest of your body still', 'Slow: about 10 seconds a circle', 'Go both directions'],
        },
      ],
    },
    {
      id: 'adductors',
      name: 'Adductors & Squat Depth',
      steps: [
        {
          id: 'frog-stretch',
          name: 'Frog Stretch',
          level: 1,
          target: hold(2, 45),
          description:
            'On all fours, slide your knees wide apart with your ankles in line with your knees, and gently rock your hips back. Opens up the inner thighs.',
          cues: ['Pad your knees', 'Rock back slowly', 'Stay where you feel a stretch, not pain'],
        },
        {
          id: 'deep-squat-hold',
          name: 'Deep Squat Hold',
          level: 2,
          target: hold(3, 30),
          description:
            'Sit into the bottom of a squat with heels down and chest up, holding a door frame or table if needed. Restores the deep squat your hips are built for.',
          cues: ['Heels down (put something under them if needed)', 'Elbows gently push the knees out', 'Hold onto something at first'],
        },
        {
          id: 'cossack-squat',
          name: 'Cossack Squat',
          level: 3,
          target: repsEach(3, 6),
          description:
            'From a wide stance, sit down over one leg while the other stays straight with its toes up, then shift across to the other side. Builds mobile, strong hips.',
          cues: ['Heel of the squatting leg stays down', 'Straight leg: toes point up', 'Hold a doorway for balance at first'],
        },
      ],
    },
    {
      id: 'glutes',
      name: 'Glute Strength',
      steps: [
        {
          id: 'clamshell',
          name: 'Clamshell',
          level: 1,
          target: repsEach(3, 15),
          description:
            'Lying on your side with knees bent and feet together, lift your top knee like a clamshell opening, without rolling your hips back.',
          cues: ['Hips stacked, no rolling back', 'Squeeze at the top for a second', 'Slow on the way down'],
        },
        {
          id: 'side-lying-leg-raise',
          name: 'Side-lying Leg Raise',
          level: 1,
          target: repsEach(3, 12),
          description:
            'Lying on your side with your bottom knee bent, lift the straight top leg slightly behind you, heel first. Targets the glute med that steadies the hip.',
          cues: ['Lead with the heel', 'Leg slightly behind your body', 'Lift only as high as the hip allows'],
        },
        {
          id: 'banded-clamshell',
          name: 'Banded Clamshell',
          level: 2,
          target: repsEach(3, 15),
          equipment: ['bands'],
          alternatives: ['side-lying-leg-raise'],
          description: 'The clamshell with a mini band just above your knees for extra resistance.',
          cues: ['Band above the knees', 'Hips stay stacked', 'Control the close'],
        },
        {
          id: 'banded-lateral-walk',
          name: 'Banded Lateral Walk',
          level: 2,
          target: repsEach(3, 12),
          equipment: ['bands'],
          alternatives: ['side-lying-leg-raise', 'single-leg-glute-bridge'],
          description:
            'With a mini band around your legs, sit into a quarter squat and step sideways, keeping tension on the band the whole way.',
          cues: ['Stay low in a half squat', "Feet don't come together", 'Toes point forward'],
        },
      ],
    },
    {
      id: 'copenhagen',
      name: 'Adductor Strength',
      from: ['side-lying-leg-raise'],
      steps: [
        {
          id: 'copenhagen-plank-short',
          name: 'Short Copenhagen Plank',
          level: 3,
          target: holdEach(3, 15),
          description:
            'Side plank with your top knee resting on a bench or chair and the bottom leg tucked under. Strengthens the inner thighs, which protect the hips and groin.',
          cues: ['Knee on the bench, not the foot', 'Body in a straight line', 'Start with short holds'],
        },
        {
          id: 'copenhagen-plank',
          name: 'Copenhagen Plank',
          level: 4,
          target: holdEach(3, 20),
          description:
            'The full version: only your top foot rests on the bench, with the bottom leg lifted to meet it.',
          cues: ['Top ankle on the bench', 'Lift the bottom leg up to the bench', 'Hips high and forward'],
        },
      ],
    },
  ],
};
