import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { exerciseById, trees, type TreeDef } from '@ascent/core/data';
import { treeStats } from '@ascent/core/lib/graph';
import { Card, ProgressBar, Screen, SectionTitle } from '../../components/ui';
import { useProgress } from '../../state/ProgressContext';
import { colors, space, type } from '../../theme';

export default function SkillsScreen() {
  const { state } = useProgress();
  const section = (kind: TreeDef['kind']) =>
    trees
      .filter((t) => t.kind === kind)
      .map((t) => {
        const stats = treeStats(t.id, state.mastered);
        return (
          <Pressable role="button" key={t.id} onPress={() => router.push(`/tree/${t.id}`)}>
            <Card accent={t.color}>
              <View style={styles.row}>
                <Text style={[type.heading, { flex: 1 }]}>{t.name}</Text>
                <Text style={[type.small, { color: t.color, fontWeight: '800' }]}>
                  {stats.done}/{stats.total}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text3} />
              </View>
              <Text style={type.small} numberOfLines={2}>
                {t.tagline}
              </Text>
              <ProgressBar value={stats.done / stats.total} color={t.color} />
              <Text style={[type.small, { color: colors.text3 }]}>Goal: {exerciseById[t.ultimate].name}</Text>
            </Card>
          </Pressable>
        );
      });

  return (
    <Screen>
      <Text style={type.hero}>Skills</Text>
      <SectionTitle>Skill trees</SectionTitle>
      {section('skill')}
      <SectionTitle>Physical therapy & mobility</SectionTitle>
      {section('therapy')}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
});
