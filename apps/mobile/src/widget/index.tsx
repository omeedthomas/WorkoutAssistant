import type { ActiveWorkout } from '@ascent/core/state/activeWorkout';
import type { ProgressState } from '@ascent/core/state/progress';

// The home screen widget is Android only for now (index.android.tsx); on iOS and web these do nothing.

export function registerWidgets() {}

export function refreshWidgets(_state: ProgressState, _active: ActiveWorkout | null) {}
