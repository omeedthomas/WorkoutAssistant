import { describe, expect, it } from 'vitest';
import { formatAdded, formatWeight, fromUnits, loadStepKg, snapLoad, toUnits } from './units';

describe('units', () => {
  it('converts between kg and lb without drifting', () => {
    expect(toUnits(fromUnits(172.5, 'lb'), 'lb')).toBe(172.5);
    expect(toUnits(80, 'lb')).toBe(176.4);
    expect(fromUnits(80, 'kg')).toBe(80);
  });

  it('formats body weight and added weight', () => {
    expect(formatWeight(80, 'kg')).toBe('80 kg');
    expect(formatWeight(fromUnits(172.5, 'lb'), 'lb')).toBe('172.5 lb');
    expect(formatAdded(fromUnits(25, 'lb'), 'lb')).toBe('+25 lb');
    expect(formatAdded(0, 'lb')).toBe('bodyweight');
  });

  it('steps added weight by one pair of small plates', () => {
    expect(toUnits(loadStepKg('lb'), 'lb')).toBe(5);
    expect(loadStepKg('kg')).toBe(2.5);
  });

  it('rounds loads to what you can put on, and rounds targets up', () => {
    expect(toUnits(snapLoad(fromUnits(23, 'lb'), 'lb'), 'lb')).toBe(25);
    expect(snapLoad(11, 'kg')).toBe(10);
    // 20 kg is 44.1 lb: the target shows as 45 lb, which then meets the 20 kg target.
    expect(toUnits(snapLoad(20, 'lb', 'up'), 'lb')).toBe(45);
    expect(snapLoad(20, 'lb', 'up')).toBeGreaterThanOrEqual(20);
    expect(snapLoad(20, 'kg', 'up')).toBe(20);
  });
});
