import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { REMINDER_HOURS } from '@ascent/core/lib/history';
import { notificationAccess, notificationsSupported, requestNotificationAccess, type NotificationAccess } from '../lib/notifications';
import { usePrefs, type Prefs } from '../state/PrefsContext';
import { colors, space, type } from '../theme';
import { Button, Card, Segmented, Toggle } from './ui';

const DAILY_HOURS = [7, 12, 17, 20];
const DEFAULT_DAILY_HOUR = 17;
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;

/** Streak and daily reminders. Notifications are per phone, so each one asks for permission and keeps its own settings. */
export function RemindersCard() {
  const { prefs, setPrefs } = usePrefs();
  const [access, setAccess] = useState<NotificationAccess | null>(null);
  const [asked, setAsked] = useState(false);

  // Notifications can be turned off in the phone's settings at any time, so check again on coming back.
  useEffect(() => {
    const check = () => void notificationAccess().then(setAccess);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  if (!notificationsSupported) return null;

  /** A reminder only turns on once notifications are allowed. */
  const turnOn = async (change: Partial<Prefs>) => {
    const next = await requestNotificationAccess();
    setAccess(next);
    setAsked(true);
    if (next === 'granted') setPrefs(change);
  };

  const daily = prefs.dailyReminderHour;
  const blocked = access === 'denied' && (asked || prefs.streakReminders || daily !== null);

  return (
    <>
      <Card style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={type.heading}>Streak reminders</Text>
          <Text style={type.small}>On your streak's last day, at {REMINDER_HOURS.map(hourLabel).join(' and ')} if you haven't trained yet.</Text>
        </View>
        <Toggle
          label="Streak reminders"
          value={prefs.streakReminders}
          onChange={(on) => (on ? void turnOn({ streakReminders: true }) : setPrefs({ streakReminders: false }))}
        />
      </Card>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={type.heading}>Daily reminder</Text>
            <Text style={type.small}>Today's workout at the time you pick. Skipped once you've trained.</Text>
          </View>
          <Toggle
            label="Daily reminder"
            value={daily !== null}
            onChange={(on) => (on ? void turnOn({ dailyReminderHour: DEFAULT_DAILY_HOUR }) : setPrefs({ dailyReminderHour: null }))}
          />
        </View>
        {daily !== null && (
          <Segmented
            value={String(daily)}
            onChange={(h) => setPrefs({ dailyReminderHour: Number(h) })}
            options={DAILY_HOURS.map((h) => ({ value: String(h), label: hourLabel(h) }))}
          />
        )}
      </Card>
      {blocked && (
        <Card accent={colors.gold}>
          <Text style={type.small}>Notifications are turned off for Ascent in your phone's settings, so reminders can't be sent.</Text>
          <Button label="Open settings" kind="secondary" onPress={() => void Linking.openSettings()} />
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
});
