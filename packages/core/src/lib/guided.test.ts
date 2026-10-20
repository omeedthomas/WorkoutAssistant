import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data';
import { drillById, drills, drillVideo } from '../data/drills';
import { drillVideos } from '../data/videos';
import type { ActiveWorkout } from '../state/activeWorkout';
import {
  clock,
  DRILL_SET_REST,
  firstStepOf,
  guidedSteps,
  isLastOfItem,
  PHASE_REST,
  restAnnouncement,
  spokenDuration,
  startAnnouncement,
} from './guided';
import { restSeconds } from './progression';

const workout: ActiveWorkout = {
  day: 'x',
  startedAt: '2026-10-18T18:00:00.000Z',
  focus: ['push', 'core'],
  length: 'short',
  warmup: ['pulse', 'arm-circles', 'active-hang'],
  main: [
    { exerciseId: 'pushup', sets: 3, value: 8, kind: 'progress', reason: '', why: '', block: 'strength' },
    { exerciseId: 'weighted-pushup', sets: 2, value: 5, addedKg: 10, kind: 'progress', reason: '', why: '', block: 'strength' },
    { exerciseId: 'side-plank', sets: 2, value: 20, kind: 'progress', reason: '', why: '', block: 'core' },
  ],
  cooldown: ['chest-stretch', 'breathing'],
  notes: [],
  checked: [],
  guided: true,
  position: 0,
};

const steps = guidedSteps(workout, 'lb');
const of = (id: string) => steps.filter((s) => s.id === id);

describe('guided workout steps', () => {
  it('plays every set of every drill and exercise in order', () => {
    expect([...new Set(steps.map((s) => s.id))]).toEqual([
      'pulse',
      'arm-circles',
      'active-hang',
      'pushup',
      'weighted-pushup',
      'side-plank',
      'chest-stretch',
      'breathing',
    ]);
    expect(of('pushup').map((s) => s.set)).toEqual([1, 2, 3]);
    expect(steps.map((s) => s.item)).toEqual([...steps.map((s) => s.item)].sort((a, b) => a - b));
  });

  it('times timed work and counts reps for the rest', () => {
    expect(of('pulse')[0]).toMatchObject({ seconds: 120, phase: 'warmup' });
    expect(of('arm-circles')[0]).toMatchObject({ reps: '10 each direction' });
    expect(of('pushup')[0]).toMatchObject({ reps: '8 reps', phase: 'main' });
    expect(of('arm-circles')[0]).not.toHaveProperty('seconds');
    expect(of('pushup')[0]).not.toHaveProperty('seconds');
    expect(of('weighted-pushup')[0].load).toEqual({ text: '+22 lb', spoken: '22 pounds added' });
  });

  it('runs each side of a per-side hold as its own step, resting only after both', () => {
    const plank = of('side-plank');
    expect(plank.map((s) => [s.set, s.side?.label])).toEqual([
      [1, 'Left side'],
      [1, 'Right side'],
      [2, 'Left side'],
      [2, 'Right side'],
    ]);
    expect(plank[0].rest).toBe(0);
    expect(plank[1].rest).toBe(restSeconds(exerciseById['side-plank']));
    const stretch = of('chest-stretch');
    expect(stretch.map((s) => s.side?.label)).toEqual(['Left side', 'Right side']);
  });

  it('rests between sets, briefly between exercises, and between phases', () => {
    const [p1, , p3] = of('pushup');
    expect(p1.rest).toBe(restSeconds(exerciseById.pushup));
    expect(p1.rest).toBe(120); // a full push-up set close to your limit needs real rest
    expect(p3.rest).toBe(60); // moving on to a different exercise
    expect(of('active-hang').map((s) => s.rest)).toEqual([DRILL_SET_REST, PHASE_REST]);
    expect(of('pulse')[0].rest).toBe(0); // straight on to the next drill
    expect(of('side-plank').at(-1)!.rest).toBe(PHASE_REST);
    expect(steps.at(-1)!.rest).toBe(0);
  });

  it('finds where each item starts and ends', () => {
    const i = firstStepOf(steps, 'exercise', 'pushup');
    expect(steps[i]).toMatchObject({ id: 'pushup', set: 1 });
    expect(firstStepOf(steps, 'drill', 'missing')).toBe(0);
    expect(isLastOfItem(steps, i)).toBe(false);
    expect(isLastOfItem(steps, i + 2)).toBe(true);
    expect(isLastOfItem(steps, steps.length - 1)).toBe(true);
  });
});

describe('announcements', () => {
  it('says what to do and for how long or how many', () => {
    const [p1] = of('pushup');
    expect(startAnnouncement(p1)).toBe('Set 1 of 3. Time to do Push-up for 8 reps.');
    expect(startAnnouncement(of('weighted-pushup')[0])).toBe('Set 1 of 2. Time to do Weighted Push-up for 5 reps, with 22 pounds added.');
    expect(startAnnouncement(of('pulse')[0])).toBe('Time to do Jumping Jacks or Brisk March for 2 minutes.');
    expect(startAnnouncement(of('arm-circles')[0])).toBe('Time to do Arm Circles: 10 each direction.');
    const [left, right] = of('side-plank');
    expect(startAnnouncement(left)).toBe('Set 1 of 2. Time to do Side Plank for 20 seconds, left side first.');
    expect(startAnnouncement(right)).toBe('Switch sides. Right side, 20 seconds.');
  });

  it('says how long to rest and what comes next', () => {
    const [p1, p2] = of('pushup');
    expect(restAnnouncement(p1.rest, p2)).toBe('Rest for 2 minutes. Next up: Push-up, set 2 of 3.');
    expect(restAnnouncement(30, of('chest-stretch')[0])).toBe('Rest for 30 seconds. Next up: Doorway Chest Stretch.');
  });

  it('reads and shows durations naturally', () => {
    expect(spokenDuration(1)).toBe('1 second');
    expect(spokenDuration(45)).toBe('45 seconds');
    expect(spokenDuration(60)).toBe('1 minute');
    expect(spokenDuration(150)).toBe('2 minutes 30 seconds');
    expect(clock(90)).toBe('1:30');
    expect(clock(4.2)).toBe('0:05');
    expect(clock(-1)).toBe('0:00');
  });
});

describe('rest between sets', () => {
  it('is short for therapy and easy steps and long for hard or weighted sets', () => {
    expect(restSeconds(exerciseById['band-pull-apart'])).toBe(30);
    expect(restSeconds(exerciseById['wall-pushup'])).toBe(45);
    expect(restSeconds(exerciseById.pushup)).toBe(120);
    expect(restSeconds(exerciseById['weighted-pushup'])).toBe(150);
  });
});

describe('drill demos and timers', () => {
  it('has a demo video for every drill', () => {
    expect(drills.filter((d) => !drillVideo(d)).map((d) => d.id)).toEqual([]);
    expect(Object.keys(drillVideos).filter((id) => !drillById[id])).toEqual([]);
    for (const d of drills) if (d.exercise) expect(exerciseById[d.exercise], d.id).toBeDefined();
  });

  it('fits each timed drill into its time estimate', () => {
    for (const d of drills) {
      if (!d.timer) continue;
      const work = d.timer.sets * d.timer.seconds * (d.timer.sides ? 2 : 1);
      expect(work, d.id).toBeLessThanOrEqual(d.seconds);
    }
  });
});
