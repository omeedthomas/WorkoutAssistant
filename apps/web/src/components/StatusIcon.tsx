import { Check, CircleDot, Lock } from 'lucide-react';
import type { Status } from '@ascent/core/lib/graph';

export const statusLabel: Record<Status, string> = {
  mastered: 'Mastered',
  available: 'Ready to train',
  locked: 'Locked',
};

export function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  const props = { size, 'aria-hidden': true, strokeWidth: 2.5 } as const;
  if (status === 'mastered') return <Check {...props} className="status-icon is-mastered" />;
  if (status === 'locked') return <Lock {...props} className="status-icon is-locked" />;
  return <CircleDot {...props} className="status-icon is-available" />;
}
