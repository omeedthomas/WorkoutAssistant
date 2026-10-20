import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { exerciseById, tracks, treeById, type TreeId } from '@ascent/core/data';
import { formatTarget } from '@ascent/core/lib/format';
import { statusOf, treeStats, type Status } from '@ascent/core/lib/graph';
import { Card, ProgressBar, Screen } from '../../components/ui';
import { useProgress } from '../../state/ProgressContext';
import { colors, space, type } from '../../theme';

const STATUS_ICON: Record<Status, { name: 'checkmark-circle' | 'radio-button-on' | 'lock-closed'; color?: string }> = {
  mastered: { name: 'checkmark-circle', color: colors.success },
  available: { name: 'radio-button-on' },
  locked: { name: 'lock-closed', color: colors.text3 },
};

export default function TreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useProgress();
  const tree = treeById[id as TreeId];
  if (!tree) return null;
  const stats = treeStats(tree.id, state.mastered);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: tree.name }} />
      <Text style={type.small}>{tree.tagline}</Text>
      <View style={{ gap: space(1) }}>
        <ProgressBar value={stats.done / stats.total} color={tree.color} />
        <Text style={type.small}>
          {stats.done} of {stats.total} mastered · goal: {exerciseById[tree.ultimate].name}
        </Text>
      </View>
      {tracks
        .filter((t) => t.tree === tree.id)
        .map((track) => {
          const from = track.steps[0].requires.filter((r) => exerciseById[r].tree !== tree.id);
          return (
            <Card key={track.key}>
              <Text style={type.heading}>{track.name}</Text>
              {from.length > 0 && (
                <Text style={[type.small, { color: colors.text3 }]}>Needs {from.map((r) => exerciseById[r].name).join(' and ')}</Text>
              )}
              {track.steps.map((step, i) => {
                const status = statusOf(step.id, state.mastered);
                const icon = STATUS_ICON[status];
                return (
                  <Pressable role="button" key={step.id} onPress={() => router.push(`/exercise/${step.id}`)} style={styles.step}>
                    <View style={styles.rail}>
                      <Ionicons name={icon.name} size={22} color={icon.color ?? tree.color} />
                      {i < track.steps.length - 1 && <View style={[styles.line, status === 'mastered' && { backgroundColor: colors.success }]} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: space(3) }}>
                      <Text style={[type.body, { fontWeight: '700' }, status === 'locked' && { color: colors.text2 }]}>
                        {step.name}
                        {step.id === tree.ultimate ? '  ★' : ''}
                      </Text>
                      <Text style={type.small}>
                        L{step.level} · {formatTarget(step.target, { units: state.units })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text3} />
                  </Pressable>
                );
              })}
            </Card>
          );
        })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space(3), alignItems: 'flex-start' },
  rail: { alignItems: 'center', width: 22 },
  line: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.surface3, marginTop: 2 },
});
