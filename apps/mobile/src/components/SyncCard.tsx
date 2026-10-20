import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import type { SyncStatus } from '@ascent/core/cloud/types';
import { formatDate } from '@ascent/core/lib/format';
import { useCloud } from '../state/CloudContext';
import { colors, space, type } from '../theme';
import { Button, Card } from './ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

const STATUS: Record<SyncStatus, { icon: IconName; color: string; text: string }> = {
  idle: { icon: 'cloud-outline', color: colors.text3, text: 'Connecting…' },
  syncing: { icon: 'sync', color: colors.accent, text: 'Syncing…' },
  synced: { icon: 'cloud-done', color: colors.success, text: 'Synced' },
  offline: { icon: 'cloud-offline', color: colors.gold, text: "Offline: changes are saved on this phone and upload when you're back" },
  error: { icon: 'alert-circle', color: colors.danger, text: "Couldn't sync" },
  reconnect: { icon: 'key', color: colors.gold, text: 'Google Drive access ran out' },
};

const ago = (ms: number) => {
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  return formatDate(new Date(ms).toISOString());
};

/** Sign in to Google Drive, see how syncing is going, and sign out. */
export function SyncCard() {
  const cloud = useCloud();

  if (!cloud.available) {
    return (
      <Card>
        <Text style={type.body}>Your progress is saved on this phone.</Text>
        <Text style={type.small}>
          {cloud.unavailableReason ??
            "Google Drive sync isn't set up in this build yet: it needs the app's Google client ids in apps/mobile/.env.local (see .env.example)."}
        </Text>
      </Card>
    );
  }
  if (!cloud.ready) {
    return (
      <Card style={{ alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }
  if (!cloud.user) {
    return (
      <Card>
        <Text style={type.body}>
          Save your progress to your own Google Drive, so it's safe if you lose your phone and shared with the Ascent
          website.
        </Text>
        <Button label="Sign in with Google" onPress={() => void cloud.signIn()} icon={<Ionicons name="logo-google" size={18} color={colors.accentInk} />} />
        {cloud.error && <Text style={[type.small, { color: colors.danger }]}>{cloud.error}</Text>}
      </Card>
    );
  }

  const s = STATUS[cloud.status];
  const initial = (cloud.user.name ?? cloud.user.email ?? '?').charAt(0).toUpperCase();
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.heading}>{cloud.user.name ?? 'Google account'}</Text>
          {cloud.user.email && <Text style={type.small}>{cloud.user.email}</Text>}
        </View>
      </View>
      <View style={styles.row} aria-live="polite">
        <Ionicons name={s.icon} size={18} color={s.color} />
        <Text style={[type.small, { color: s.color, flex: 1 }]}>
          {s.text}
          {cloud.status === 'synced' && cloud.lastSyncedAt ? ` ${ago(cloud.lastSyncedAt)}` : ''}
        </Text>
      </View>
      {cloud.error && cloud.status !== 'synced' && <Text style={[type.small, { color: colors.danger }]}>{cloud.error}</Text>}
      <View style={styles.row}>
        {cloud.status === 'reconnect' ? (
          <Button label="Reconnect" onPress={() => void cloud.reconnect()} style={{ flex: 1 }} />
        ) : (
          <Button label="Sync now" kind="secondary" onPress={cloud.syncNow} disabled={cloud.status === 'syncing'} style={{ flex: 1 }} />
        )}
        <Button label="Sign out" kind="ghost" onPress={() => void cloud.signOut()} style={{ flex: 1 }} />
      </View>
      {cloud.folderUrl && (
        <Button
          label="Open in Google Drive"
          kind="ghost"
          onPress={() => void Linking.openURL(cloud.folderUrl!)}
          icon={<Ionicons name="open-outline" size={16} color={colors.text} />}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.accentInk },
});
