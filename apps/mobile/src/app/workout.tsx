import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exerciseById, treeById } from '@ascent/core/data';
import { activeCalories, DEFAULT_BODY_KG } from '@ascent/core/lib/calories';
import { formatWork } from '@ascent/core/lib/format';
import { meetsTarget } from '@ascent/core/lib/graph';
import { clock, guidedSteps, type GuidedPhase, type GuidedStep } from '@ascent/core/lib/guided';
import { bodyWeightOn } from '@ascent/core/lib/history';
import type { ActiveWorkout } from '@ascent/core/state/activeWorkout';
import { Button, ProgressBar } from '../components/ui';
import { confirm, notify } from '../lib/dialogs';
import { useGuidedPlayer, type LoggedNote } from '../lib/useGuidedPlayer';
import { useActiveWorkout, type ActiveWorkoutApi } from '../state/ActiveWorkoutContext';
import { usePrefs } from '../state/PrefsContext';
import { useProgress } from '../state/ProgressContext';
import { colors, radius, space, type } from '../theme';

const PHASE_LABEL: Record<GuidedPhase, string> = { warmup: 'Warm-up', main: 'Workout', cooldown: 'Cooldown', mobility: 'Mobility' };

export default function WorkoutScreen() {
  const session = useActiveWorkout();
  if (!session.active) return <Redirect href="/" />;
  return <Player active={session.active} session={session} />;
}

function Player({ active, session }: { active: ActiveWorkout; session: ActiveWorkoutApi }) {
  useKeepAwake();
  const { state, log, master, finishWorkout } = useProgress();
  const { prefs } = usePrefs();
  // The workout is a snapshot, so its steps only change if you switch units.
  const steps = useMemo(() => guidedSteps(active, state.units), [active.startedAt, state.units]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pick up where you left off, skipping anything already done.
  const start = useMemo(() => {
    const from = Math.min(active.position, steps.length - 1);
    const done = (s: GuidedStep) =>
      s.kind === 'drill' ? active.checked.includes(s.id) : !!active.main.find((m) => m.exerciseId === s.id)?.logged;
    const first = steps.findIndex((s, i) => i >= from && !done(s));
    return first < 0 ? from : first;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Logs the sets you completed of a finished exercise (drills are just ticked off). */
  const onItemDone = (s: GuidedStep, sets: number): LoggedNote | null => {
    if (s.kind === 'drill') {
      session.checkDrill(s.id);
      return null;
    }
    const m = active.main.find((x) => x.exerciseId === s.id);
    if (!m || m.logged) return null;
    const ex = exerciseById[s.id];
    const planned = { sets: m.sets, value: m.value, ...(ex.target.addedKg !== undefined && { addedKg: m.addedKg ?? 0 }) };
    const work = { ...planned, sets: Math.min(sets, m.sets) };
    const logId = log(ex.id, work, planned);
    session.markLogged(ex.id, { ...work, logId });
    return { id: ex.id, text: formatWork(ex, work, state.units), mastery: !state.mastered[ex.id] && meetsTarget(ex, work) };
  };

  const p = useGuidedPlayer({
    steps,
    start,
    voice: prefs.voice,
    onPosition: session.setPosition,
    onItemDone,
    doneSpeech: 'Workout complete. Great job!',
  });

  const kcal = activeCalories(active, bodyWeightOn(state) ?? DEFAULT_BODY_KG);
  const finish = () => {
    finishWorkout(active.startedAt, kcal);
    session.end();
    router.back();
  };
  const leave = () =>
    confirm('Leave workout?', 'Your progress is saved. You can continue from Today.', 'Leave', () => router.back());

  if (p.stage.kind === 'done') {
    const logged = active.main.filter((m) => m.logged).length;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Ionicons name="trophy" size={72} color={colors.gold} />
          <Text style={type.eyebrow}>Workout complete</Text>
          <Text style={styles.bigTitle}>Great job!</Text>
          <Text style={[type.body, { color: colors.text2, textAlign: 'center' }]}>
            {logged} of {active.main.length} exercises logged · about {kcal} kcal burned
          </Text>
        </View>
        <Button label="Finish workout" big onPress={finish} style={{ margin: space(4) }} />
      </SafeAreaView>
    );
  }

  const resting = p.stage.kind === 'rest';
  // While resting, show what's coming up.
  const shown = resting && p.next ? p.next : p.step;
  const color = shown.kind === 'exercise' ? treeById[exerciseById[shown.id].tree].color : colors.accent;
  const timed = p.stage.kind === 'ready' || (p.stage.kind === 'work' && p.step.seconds !== undefined) || resting;
  const total = p.stage.kind === 'work' ? (p.stage.total ?? 0) : p.stage.total;
  const fraction = timed && total ? Math.max(0, (p.left ?? 0) * 1000) / total : 0;

  return (
    <SafeAreaView style={[styles.screen, resting && { backgroundColor: colors.surface }]}>
      <View style={styles.top}>
        <Pressable role="button" aria-label="Leave workout" onPress={leave} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text2} />
        </Pressable>
        <Text style={type.eyebrow}>{resting ? 'Rest' : PHASE_LABEL[shown.phase]}</Text>
        <Text style={[type.small, { minWidth: 28, textAlign: 'right' }]}>
          {p.index + 1}/{steps.length}
        </Text>
      </View>
      <View style={{ paddingHorizontal: space(4) }}>
        <ProgressBar value={p.progress} color={color} />
      </View>

      <View style={styles.center}>
        {resting ? (
          <>
            <Text style={styles.restLabel}>REST</Text>
            <Text style={styles.timer}>{clock(p.left ?? 0)}</Text>
            {p.justLogged && (
              <View style={styles.logged}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={type.small}>
                  Logged {exerciseById[p.justLogged.id].name}: {p.justLogged.text}
                </Text>
              </View>
            )}
            {p.justLogged?.mastery && (
              <Button
                label={`Mastery target hit! Mark ${exerciseById[p.justLogged.id].name} mastered`}
                kind="secondary"
                onPress={() => {
                  master(p.justLogged!.id, { includeAncestors: true });
                  notify('Mastered!', `${exerciseById[p.justLogged!.id].name} is mastered.`);
                }}
              />
            )}
            <Text style={[type.eyebrow, { marginTop: space(6) }]}>Up next</Text>
            <Text style={styles.nextName}>{shown.name}</Text>
            <Text style={type.small}>{describe(shown)}</Text>
          </>
        ) : (
          <>
            <View style={[styles.badge, { backgroundColor: `${color}26` }]}>
              <Text style={[styles.badgeText, { color }]}>
                {shown.sets > 1 ? `Set ${shown.set} of ${shown.sets}` : shown.kind === 'drill' ? 'Drill' : 'Exercise'}
                {shown.side ? ` · ${shown.side.label}` : ''}
              </Text>
            </View>
            <Text style={styles.bigTitle}>{shown.name}</Text>
            {p.stage.kind === 'ready' ? (
              <>
                <Text style={styles.restLabel}>GET READY</Text>
                <Text style={styles.timer}>{p.left}</Text>
              </>
            ) : p.step.seconds !== undefined ? (
              <Text style={styles.timer}>{clock(p.left ?? p.step.seconds)}</Text>
            ) : (
              <>
                <Text style={styles.reps}>{p.step.reps}</Text>
                {p.step.load && <Text style={styles.load}>{p.step.load.text}</Text>}
              </>
            )}
            <Text style={[type.body, { color: colors.text2, textAlign: 'center' }]}>{shown.cue}</Text>
            {shown.setup && <Text style={[type.small, { textAlign: 'center' }]}>{shown.setup}</Text>}
            {shown.video && (
              <Pressable role="button" onPress={() => void Linking.openURL(`https://www.youtube.com/watch?v=${shown.video!.youtubeId}`)} style={styles.video}>
                <Ionicons name="logo-youtube" size={18} color={colors.danger} />
                <Text style={[type.small, { color: colors.text }]}>Watch how</Text>
              </Pressable>
            )}
          </>
        )}
        {timed && (
          <View style={{ alignSelf: 'stretch', marginTop: space(4) }}>
            <ProgressBar value={fraction} color={resting ? colors.text3 : color} height={8} />
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable role="button" aria-label="Previous" onPress={p.back} style={styles.round}>
          <Ionicons name="play-skip-back" size={22} color={colors.text} />
        </Pressable>
        {resting ? (
          <>
            <Button label="+15 s" kind="secondary" onPress={() => p.addRest(15)} style={{ flex: 1 }} />
            <Button label="Skip rest" onPress={p.skipRest} style={{ flex: 1 }} />
          </>
        ) : p.stage.kind === 'work' && p.step.seconds === undefined ? (
          <Button label="DONE" big onPress={() => p.finishStep(true)} icon={<Ionicons name="checkmark" size={22} color={colors.accentInk} />} style={{ flex: 1 }} />
        ) : (
          <Button
            label={p.paused === null ? 'Pause' : 'Resume'}
            kind="secondary"
            big
            onPress={p.togglePause}
            icon={<Ionicons name={p.paused === null ? 'pause' : 'play'} size={20} color={colors.text} />}
            style={{ flex: 1 }}
          />
        )}
        <Pressable role="button" aria-label="Skip this exercise" onPress={p.skipItem} style={styles.round}>
          <Ionicons name="play-skip-forward" size={22} color={colors.text} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function describe(s: GuidedStep): string {
  const set = s.sets > 1 ? `Set ${s.set} of ${s.sets} · ` : '';
  return `${set}${s.seconds !== undefined ? clock(s.seconds) : s.reps ?? ''}${s.side ? ` · ${s.side.label}` : ''}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space(4) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(6), gap: space(3) },
  badge: { borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(1) },
  badgeText: { fontSize: 14, fontWeight: '800' },
  bigTitle: { fontSize: 32, fontWeight: '900', color: colors.text, textAlign: 'center' },
  restLabel: { fontSize: 16, fontWeight: '900', color: colors.text3, letterSpacing: 4 },
  timer: { fontSize: 96, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  reps: { fontSize: 64, fontWeight: '900', color: colors.text, textAlign: 'center' },
  load: { fontSize: 20, fontWeight: '800', color: colors.gold },
  nextName: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  logged: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  video: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(4) },
  round: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
