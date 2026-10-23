import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Reminder } from '@ascent/core/lib/reminders';

/**
 * Reminders as local notifications: the phone schedules them ahead of time, so no push server is involved.
 * The browser preview of this app has no notifications, so everything here does nothing on web.
 */
export const notificationsSupported = Platform.OS !== 'web';

const CHANNEL = 'reminders';

export type NotificationAccess = 'granted' | 'denied' | 'undetermined';

if (notificationsSupported) {
  // Without a handler, reminders that arrive while Ascent is open aren't shown at all.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Android files notifications under a channel the user can mute separately; it must exist before asking. */
async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Workout reminders', importance: Notifications.AndroidImportance.DEFAULT });
  }
}

function accessOf(p: Notifications.NotificationPermissionsStatus): NotificationAccess {
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function notificationAccess(): Promise<NotificationAccess> {
  if (!notificationsSupported) return 'denied';
  return accessOf(await Notifications.getPermissionsAsync());
}

/** Asks for permission if it can still be asked. Once denied, it can only be turned on in the phone's settings. */
export async function requestNotificationAccess(): Promise<NotificationAccess> {
  if (!notificationsSupported) return 'denied';
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  return accessOf(current.granted || !current.canAskAgain ? current : await Notifications.requestPermissionsAsync());
}

// Runs one replacement at a time, so an older one can't finish after a newer one and leave stale reminders behind.
let queue = Promise.resolve();

/** Replaces every scheduled reminder with these (none if notifications aren't allowed). */
export function scheduleReminders(reminders: Reminder[]): Promise<void> {
  queue = queue
    .then(async () => {
      if (!notificationsSupported) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!reminders.length || (await notificationAccess()) !== 'granted') return;
      await ensureChannel();
      for (const r of reminders) {
        await Notifications.scheduleNotificationAsync({
          identifier: r.id,
          content: { title: r.title, body: r.body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
        });
      }
    })
    .catch(() => {
      // Scheduling failed (e.g. the system limit): the next change tries again.
    });
  return queue;
}
