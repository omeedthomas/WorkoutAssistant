import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { dayCalories, DEFAULT_BODY_KG } from '@ascent/core/lib/calories';
import { formatDay, formatWork } from '@ascent/core/lib/format';
import { bodyWeightOn, daySummaries, dayTotals, streakOf, trainedDays } from '@ascent/core/lib/history';
import { localDay } from '@ascent/core/state/progress';
import { Card, Screen, SectionTitle } from '../../components/ui';
import { useProgress } from '../../state/ProgressContext';
import { colors, space, type } from '../../theme';

export default function HistoryScreen() {
  const { state } = useProgress();
  const today = localDay();
  const days = useMemo(() => trainedDays(state), [state]);
  const streak = streakOf(days, today);
  const thisMonth = days.filter((d) => d.slice(0, 7) === today.slice(0, 7)).length;
  const summaries = useMemo(
    () => [...daySummaries(state).values()].filter((s) => s.trained).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 30),
    [state],
  );
  const kg = bodyWeightOn(state) ?? DEFAULT_BODY_KG;

  return (
    <Screen>
      <Text style={type.hero}>History</Text>
      <View style={styles.stats}>
        <Stat icon="flame" color={colors.gold} value={streak.days} label="day streak" />
        <Stat icon="trophy" color={colors.accent} value={streak.best} label="best streak" />
        <Stat icon="calendar" color={colors.success} value={thisMonth} label="days this month" />
      </View>

      <SectionTitle>Recent training</SectionTitle>
      {summaries.length === 0 && <Text style={type.small}>Nothing logged yet. Finish a workout and it shows up here.</Text>}
      {summaries.map((s) => {
        const totals = dayTotals(s);
        return (
          <Card key={s.day}>
            <View style={styles.row}>
              <Text style={[type.heading, { flex: 1 }]}>{formatDay(s.day)}</Text>
              <Text style={type.small}>{dayCalories(s, kg)} kcal</Text>
            </View>
            {totals.finished.length > 0 && <Text style={[type.small, { color: colors.accent }]}>{totals.finished.join(' · ')}</Text>}
            {s.sessions.map(({ exercise, log }) => (
              <View key={log.id} style={styles.row}>
                <Text style={[type.body, { flex: 1 }]}>{exercise.name}</Text>
                <Text style={type.small}>{formatWork(exercise, log, state.units)}</Text>
              </View>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}

function Stat({ icon, color, value, label }: { icon: 'flame' | 'trophy' | 'calendar'; color: string; value: number; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: space(1) }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={type.title}>{value}</Text>
      <Text style={[type.small, { textAlign: 'center' }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space(3) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
});
