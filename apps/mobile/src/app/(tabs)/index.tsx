import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { treeById, trees, type TreeId } from '@ascent/core/data';
import { DEFAULT_BODY_KG, workoutCalories } from '@ascent/core/lib/calories';
import { formatDay } from '@ascent/core/lib/format';
import { bodyWeightOn, daySummaries, dayTotals, streakOf, trainedDays, workoutDone } from '@ascent/core/lib/history';
import { focusTitle, generateWorkout, LENGTHS, minutesByLength, sortFocus, suggestSplit, type WorkoutLength } from '@ascent/core/lib/workout';
import { workoutProgress } from '@ascent/core/state/activeWorkout';
import { localDay } from '@ascent/core/state/progress';
import { Button, Card, Chip, ProgressBar, Screen, SectionTitle, Segmented, Tag } from '../../components/ui';
import { planKindColor, planKindLabel, setsText } from '../../lib/labels';
import { useActiveWorkout } from '../../state/ActiveWorkoutContext';
import { useProgress } from '../../state/ProgressContext';
import { colors, radius, space, type } from '../../theme';

export default function TodayScreen() {
  const { state, setWorkoutPlan, recordWorkout } = useProgress();
  const session = useActiveWorkout();
  const today = localDay();

  const suggestion = useMemo(() => suggestSplit(state), [state]);
  const focus = state.workoutPlan?.focus ?? suggestion.split.focus;
  const length = state.workoutPlan?.length ?? 'standard';
  const workout = useMemo(() => generateWorkout(state, focus, length), [state, focus, length]);
  const minutes = useMemo(() => minutesByLength(state, focus), [state, focus]);
  const kcal = workoutCalories(workout, bodyWeightOn(state) ?? DEFAULT_BODY_KG);
  const streak = useMemo(() => streakOf(trainedDays(state), today), [state, today]);
  const summary = useMemo(() => daySummaries(state).get(today), [state, today]);
  const trainedToday = workoutDone(summary);

  const setPlan = (nextFocus: TreeId[], nextLength: WorkoutLength) =>
    nextFocus.length && setWorkoutPlan({ focus: sortFocus(nextFocus), length: nextLength });
  const toggle = (t: TreeId) => setPlan(focus.includes(t) ? focus.filter((f) => f !== t) : [...focus, t], length);

  const start = () => {
    const started = session.start(workout);
    recordWorkout({ title: focusTitle(workout.focus), focus: workout.focus, length: workout.length, startedAt: started.startedAt });
    router.push('/workout');
  };

  const active = session.active;
  const activeProgress = active && workoutProgress(active);
  const totals = summary && trainedToday ? dayTotals(summary) : null;

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={type.eyebrow}>{formatDay(today)}</Text>
          <Text style={type.hero}>Today</Text>
        </View>
        <View style={styles.streak} aria-label={`${streak.days} day streak`}>
          <Ionicons name="flame" size={20} color={streak.days ? colors.gold : colors.text3} />
          <Text style={[styles.streakText, !streak.days && { color: colors.text3 }]}>{streak.days}</Text>
        </View>
      </View>

      {totals && !active && (
        <Card accent={colors.success}>
          <Text style={[type.title, { color: colors.success }]}>Great job!</Text>
          <Text style={type.small}>
            {totals.exercises} exercises · {totals.sets} sets{totals.reps ? ` · ${totals.reps} reps` : ''}
            {totals.minutes ? ` · ${totals.minutes} min` : ''}
          </Text>
          <Text style={type.small}>Rest up, or keep going with another session below.</Text>
        </Card>
      )}

      {active && activeProgress ? (
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>In progress</Text>
          <Text style={styles.heroTitle}>{focusTitle(active.focus)}</Text>
          <Text style={styles.heroMeta}>
            {activeProgress.done} of {activeProgress.total} done
          </Text>
          <ProgressBar value={activeProgress.done / activeProgress.total} color={colors.accentInk} />
          <Button label="Continue workout" big kind="secondary" onPress={() => router.push('/workout')} style={styles.heroButton} />
        </View>
      ) : (
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{state.workoutPlan ? 'Your workout' : `Suggested: ${suggestion.split.name}`}</Text>
          <Text style={styles.heroTitle}>{focusTitle(workout.focus)}</Text>
          <Text style={styles.heroMeta}>
            ~{workout.minutes} min · {workout.main.length} exercises · {kcal} kcal
          </Text>
          <Button
            label="START"
            big
            kind="secondary"
            onPress={start}
            disabled={!workout.main.length}
            icon={<Ionicons name="play" size={20} color={colors.text} />}
            style={styles.heroButton}
          />
        </View>
      )}

      <SectionTitle>Areas</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
        {trees.map((t) => (
          <Chip key={t.id} label={t.name} color={t.color} selected={focus.includes(t.id)} onPress={() => toggle(t.id)} />
        ))}
      </ScrollView>
      <Segmented
        value={length}
        onChange={(l) => setPlan(focus, l)}
        options={(Object.keys(LENGTHS) as WorkoutLength[]).map((l) => ({ value: l, label: LENGTHS[l].label, hint: `~${minutes[l]} min` }))}
      />

      <SectionTitle>Exercises</SectionTitle>
      {workout.main.map((m) => {
        const tree = treeById[m.exercise.tree];
        const t = m.exercise.target;
        return (
          <Pressable role="button" key={m.exercise.id} onPress={() => router.push(`/exercise/${m.exercise.id}`)}>
            <Card accent={tree.color} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.heading}>{m.exercise.name}</Text>
                <Text style={type.small}>
                  {tree.name} · {m.why}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: space(1) }}>
                <Text style={styles.sets}>{setsText(m.plan.sets, m.plan.value, t.unit, t.perSide)}</Text>
                <Tag label={planKindLabel[m.plan.kind]} color={planKindColor(m.plan.kind)} />
              </View>
            </Card>
          </Pressable>
        );
      })}
      {workout.notes.map((n) => (
        <Text key={n} style={type.small}>
          {n}
        </Text>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
  },
  streakText: { fontSize: 18, fontWeight: '800', color: colors.gold },
  hero: { backgroundColor: colors.accent, borderRadius: radius.xl, padding: space(5), gap: space(2) },
  heroEyebrow: { ...type.eyebrow, color: colors.accentInk, opacity: 0.7 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: colors.accentInk },
  heroMeta: { fontSize: 15, fontWeight: '600', color: colors.accentInk, opacity: 0.8 },
  heroButton: { marginTop: space(2), backgroundColor: colors.accentInk, borderWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  sets: { fontSize: 16, fontWeight: '800', color: colors.text },
});
