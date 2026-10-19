/** How weights are shown. They're always stored in kg. */
export type Units = 'lb' | 'kg';

export const KG_PER_LB = 0.45359237;

/** kg → the number shown in `units`, to one decimal. */
export function toUnits(kg: number, units: Units): number {
  const v = units === 'lb' ? kg / KG_PER_LB : kg;
  return Math.round(v * 10) / 10;
}

/** A number entered in `units` → kg, kept to the gram. */
export function fromUnits(value: number, units: Units): number {
  const kg = units === 'lb' ? value * KG_PER_LB : value;
  return Math.round(kg * 1000) / 1000;
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "182.4 lb" */
export function formatWeight(kg: number, units: Units): string {
  return `${trim(toUnits(kg, units))} ${units}`;
}

/** Added weight on an exercise: "+25 lb", or "bodyweight" when there's none. */
export function formatAdded(kg: number, units: Units): string {
  return kg > 0.01 ? `+${formatWeight(kg, units)}` : 'bodyweight';
}

const PLATE: Record<Units, number> = { lb: 5, kg: 2.5 };

/** The smallest jump in added weight (a pair of small plates): 5 lb or 2.5 kg, in kg. */
export function loadStepKg(units: Units): number {
  return fromUnits(PLATE[units], units);
}

/**
 * Rounds added weight to something you can load in `units` (multiples of 5 lb
 * or 2.5 kg). Targets round up, so hitting the number shown always meets them.
 */
export function snapLoad(kg: number, units: Units, mode: 'round' | 'up' = 'round'): number {
  const plates = (units === 'lb' ? kg / KG_PER_LB : kg) / PLATE[units];
  const n = mode === 'up' ? Math.ceil(plates - 1e-6) : Math.round(plates);
  return fromUnits(Math.max(0, n) * PLATE[units], units);
}
