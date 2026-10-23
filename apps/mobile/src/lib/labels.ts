import type { PlanKind } from '@ascent/core/lib/progression';
import { colors } from '../theme';

/** Same wording as the web app's plan tags. */
export const planKindLabel: Record<PlanKind, string> = {
  start: 'Starting point',
  progress: 'Level up',
  'add-set': 'Add a set',
  repeat: 'Go again',
  reset: 'Reset',
  consolidate: 'Volume day',
  return: 'Ease back in',
  mastery: 'Mastery',
  maintain: 'Maintain',
  easier: 'Easier',
  harder: 'Harder',
};

export const planKindColor = (kind: PlanKind) =>
  kind === 'progress' || kind === 'add-set' || kind === 'harder' ? colors.success : kind === 'maintain' || kind === 'mastery' ? colors.gold : colors.accent;

/** "3 × 12", "3 × 30s", plus "each side" for per-side work. */
export function setsText(sets: number, value: number, unit: 'reps' | 'seconds', perSide?: boolean): string {
  return `${sets} × ${unit === 'seconds' ? `${value}s` : value}${perSide ? ' each side' : ''}`;
}
