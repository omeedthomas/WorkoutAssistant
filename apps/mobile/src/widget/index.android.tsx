import { registerWidgetTaskHandler, requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { restoreActiveWorkout, type ActiveWorkout } from '@ascent/core/state/activeWorkout';
import { initialProgress, sanitizeProgress, type ProgressState } from '@ascent/core/state/progress';
import { WORKOUT_KEY } from '../state/ActiveWorkoutContext';
import { PROGRESS_KEY } from '../state/ProgressContext';
import { readJson } from '../state/storage';
import { todayWidgetData } from './data';
import { TODAY_WIDGET, TodayWidget } from './TodayWidget';

/**
 * Android draws the widget by running this in the background (the app may not be open): when it's added or
 * resized, and every 30 minutes (`updatePeriodMillis`), which also rolls it over to a new day. It reads what the
 * app saved on this phone.
 */
async function widgetTaskHandler({ widgetAction, widgetInfo, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const state = sanitizeProgress(await readJson(PROGRESS_KEY)) ?? initialProgress;
  const active = restoreActiveWorkout(await readJson(WORKOUT_KEY));
  renderWidget(<TodayWidget data={todayWidgetData(state, active)} info={widgetInfo} />);
}

/** Called once from the entry file (index.ts), before the app starts. */
export function registerWidgets() {
  registerWidgetTaskHandler(widgetTaskHandler);
}

/** Redraws any Today widgets on the home screen from the app's current state. */
export function refreshWidgets(state: ProgressState, active: ActiveWorkout | null) {
  const data = todayWidgetData(state, active);
  void requestWidgetUpdate({ widgetName: TODAY_WIDGET, renderWidget: (info) => <TodayWidget data={data} info={info} /> }).catch(() => {
    // No widget on the home screen, or it couldn't be drawn: the next update tries again.
  });
}
