import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

/**
 * The voice coach and haptic taps. Speech queues by default, so new announcements stop the current one first;
 * countdown numbers are short enough to queue behind it.
 */
export function speak(text: string, enabled: boolean, opts: { interrupt?: boolean } = {}) {
  if (!enabled) return;
  if (opts.interrupt !== false) void Speech.stop();
  Speech.speak(text, { rate: 1.0, pitch: 1.0 });
}

export function stopSpeaking() {
  void Speech.stop();
}

export function tap() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function celebrate() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
