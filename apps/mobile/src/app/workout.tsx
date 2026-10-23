import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exerciseById, treeById } from '@ascent/core/data';
import { activeCalories, DEFAULT_BODY_KG } from '@ascent/core/lib/calories';
import { formatWork } from '@ascent/core/lib/format';
import { meetsTarget } from '@ascent/core/lib/graph';
import { clock, guidedSteps, workLabel, type GuidedPhase, type GuidedStep } from '@ascent/core/lib/guided';
import { bodyWeightOn } from '@ascent/core/lib/history';
import { setValues, workFromSets } from '@ascent/core/lib/sets';
import { easierStep, feedbackFor, type ActiveWorkout } from '@ascent/core/state/activeWorkout';
import { Button, ProgressBar, Stepper } from '../components/ui';
import { NO_FEEDBACK, WorkoutFeedback, type Feedback } from '../components/WorkoutFeedback';
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
  // Switching an exercise changes the steps: start the player again, on the new exercise.
  return <Player key={session.active.main.map((m) => m.exerciseId).join()} active={session.active} session={session} />;
}

function Player({ active, session }: { active: ActiveWorkout; session: ActiveWorkoutApi }) {
  useKeepAwake();
  const { state, log, editLog, rateLog, master, finishWorkout } = useProgress();
  const { prefs } = usePrefs();
  const [feedback, setFeedback] = useState<Feedback>(NO_FEEDBACK);
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

  // Exercises already logged (earlier in this workout), so redoing one set keeps the others.
  const initialSets = useMemo(() => {
    const sets: Record<number, number[]> = {};
    for (const s of steps) {
      const logged = s.kind === 'exercise' && active.main.find((m) => m.exerciseId === s.id)?.logged;
      if (logged) sets[s.item] = setValues(logged);
    }
    return sets;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Logs a finished exercise as each set went, or corrects it if it's already logged. Drills are ticked off. */
  const onItemDone = (s: GuidedStep, sets: number[]): LoggedNote | null => {
    if (s.kind === 'drill') {
      session.checkDrill(s.id);
      return null;
    }
    const m = active.main.find((x) => x.exerciseId === s.id);
    if (!m) return null;
    const ex = exerciseById[s.id];
    const planned = { sets: m.sets, value: m.value, ...(ex.target.addedKg !== undefined && { addedKg: m.addedKg ?? 0 }) };
    const work = workFromSets(sets, m.logged?.addedKg ?? planned.addedKg);
    if (m.logged) {
      editLog(ex.id, m.logged.logId, work);
      session.markLogged(ex.id, { ...work, logId: m.logged.logId });
    } else {
      session.markLogged(ex.id, { ...work, logId: log(ex.id, work, planned) });
    }
    return { id: ex.id, text: formatWork(ex, work, state.units), mastery: !state.mastered[ex.id] && meetsTarget(ex, work) };
  };

  const p = useGuidedPlayer({
    steps,
    start,
    voice: prefs.voice,
    onPosition: session.setPosition,
    onItemDone,
    initialSets,
    doneSpeech: 'Workout complete. Great job!',
  });

  const kcal = activeCalories(active, bodyWeightOn(state) ?? DEFAULT_BODY_KG);
  const finish = () => {
    for (const c of feedbackFor(active, feedback.rating, feedback.adjust)) rateLog(c.exerciseId, c.logId, c.feel);
    finishWorkout(active.startedAt, kcal, feedback.rating ?? undefined);
    session.end();
    router.back();
  };
  const leave = () =>
    confirm('Leave workout?', 'Your progress is saved. You can continue from Today.', 'Leave', () => router.back());

  if (p.stage.kind === 'done') {
    const logged = active.main.filter((m) => m.logged).length;
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.center}>
          <Ionicons name="trophy" size={72} color={colors.gold} />
          <Text style={type.eyebrow}>Workout complete</Text>
          <Text style={styles.bigTitle}>Great job!</Text>
          <Text style={[type.body, { color: colors.text2, textAlign: 'center' }]}>
            {logged} of {active.main.length} exercises logged · about {kcal} kcal burned
          </Text>
          <WorkoutFeedback active={active} units={state.units} value={feedback} onChange={setFeedback} />
        </ScrollView>
        <Button label="Finish workout" big onPress={finish} style={{ margin: space(4) }} />
      </SafeAreaView>
    );
  }

  const resting = p.stage.kind === 'rest';
  // While resting, show what's coming up.
  const shown = resting && p.next ? p.next : p.step;

  // Too hard? Switch to the step below it in its progression (or back to the one it replaced).
  const current = p.step.kind === 'exercise' ? active.main.find((m) => m.exerciseId === p.step.id) : undefined;
  const easier = current && !current.logged ? easierStep(active, current.exerciseId, state.equipment?.have ?? null) : null;
  const original = current && !current.logged && current.swappedFrom ? exerciseById[current.swappedFrom.exerciseId] : undefined;
  const swaps: { label: string; icon: 'arrow-down' | 'arrow-undo'; onPress: () => void }[] = resting
    ? []
    : [
        ...(easier ? [{ label: `Too hard? Switch to ${easier.name}`, icon: 'arrow-down' as const, onPress: () => session.swap(p.step.id, easier.id, state) }] : []),
        ...(original ? [{ label: `Back to ${original.name}`, icon: 'arrow-undo' as const, onPress: () => session.swap(p.step.id, original.id, state) }] : []),
      ];
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.center}>
        {resting ? (
          <>
            <Text style={styles.restLabel}>REST</Text>
            <Text style={styles.timer}>{clock(p.left ?? 0)}</Text>
            {p.step.kind === 'exercise' && p.setsDone[p.step.item]?.some((v) => v !== undefined) && (
              <SetsDone step={p.step} sets={p.setsDone[p.step.item]} onChange={(sets) => p.correctSets(p.step, sets)} />
            )}
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
            <Text style={styles.nextWork}>
              {workLabel(shown)}
              {shown.load ? ` · ${shown.load.text}` : ''}
            </Text>
            {describe(shown) !== '' && <Text style={type.small}>{describe(shown)}</Text>}
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
                {p.step.kind === 'exercise' && p.reps !== undefined ? (
                  <RepCounter step={p.step} reps={p.reps} onChange={p.setReps} />
                ) : (
                  <Text style={styles.reps}>{p.step.reps}</Text>
                )}
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
            {swaps.map((s) => (
              <Pressable key={s.label} role="button" onPress={s.onPress} style={styles.video}>
                <Ionicons name={s.icon} size={18} color={colors.text2} />
                <Text style={[type.small, { color: colors.text }]}>{s.label}</Text>
              </Pressable>
            ))}
          </>
        )}
        {timed && (
          <View style={{ alignSelf: 'stretch', marginTop: space(4) }}>
            <ProgressBar value={fraction} color={resting ? colors.text3 : color} height={8} />
          </View>
        )}
      </ScrollView>

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

/** Which set (and side) a step is: "Set 2 of 3 · Left side". */
function describe(s: GuidedStep): string {
  return [s.sets > 1 && `Set ${s.set} of ${s.sets}`, s.side?.label].filter(Boolean).join(' · ');
}

/** This set's reps, big, with − and + to log what you actually did before tapping Done. */
function RepCounter({ step, reps, onChange }: { step: GuidedStep; reps: number; onChange: (n: number) => void }) {
  const words = step.reps?.replace(/^\d+\s*/, '').replace(/^reps?\b/, reps === 1 ? 'rep' : 'reps');
  return (
    <View style={{ alignItems: 'center', gap: space(1) }}>
      <View style={styles.count}>
        <Pressable
          role="button"
          aria-label="One rep fewer"
          aria-disabled={reps <= 1}
          disabled={reps <= 1}
          onPress={() => onChange(reps - 1)}
          style={[styles.round, reps <= 1 && { opacity: 0.35 }]}
        >
          <Ionicons name="remove" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.countValue} aria-live="polite">
          {reps}
        </Text>
        <Pressable role="button" aria-label="One rep more" onPress={() => onChange(Math.min(200, reps + 1))} style={styles.round}>
          <Ionicons name="add" size={28} color={colors.text} />
        </Pressable>
      </View>
      <Text style={styles.countWords}>{words}</Text>
      {reps !== step.value && <Text style={type.small}>Planned {step.value}</Text>}
    </View>
  );
}

/** Resting: the sets done so far of the exercise you just did, each one correctable. */
function SetsDone({ step, sets, onChange }: { step: GuidedStep; sets: (number | undefined)[]; onChange: (sets: (number | undefined)[]) => void }) {
  const timed = step.seconds !== undefined;
  return (
    <View style={styles.sets}>
      <Text style={[type.small, { textAlign: 'center' }]}>Your sets of {step.name}. Fix any that went differently.</Text>
      <View style={styles.setsRow}>
        {sets.flatMap((v, i) =>
          v === undefined
            ? []
            : [
                <View key={i} style={styles.setCell}>
                  <Stepper
                    label={`Set ${i + 1}`}
                    value={v}
                    min={1}
                    max={timed ? 600 : 200}
                    step={timed ? 5 : 1}
                    unit={timed ? 's' : undefined}
                    onChange={(n) => onChange(sets.map((x, j) => (j === i ? n : x)))}
                  />
                </View>,
              ],
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space(4) },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(6), paddingVertical: space(2), gap: space(3) },
  badge: { borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(1) },
  badgeText: { fontSize: 14, fontWeight: '800' },
  bigTitle: { fontSize: 32, fontWeight: '900', color: colors.text, textAlign: 'center' },
  restLabel: { fontSize: 16, fontWeight: '900', color: colors.text3, letterSpacing: 4 },
  timer: { fontSize: 96, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  reps: { fontSize: 64, fontWeight: '900', color: colors.text, textAlign: 'center' },
  load: { fontSize: 20, fontWeight: '800', color: colors.gold },
  nextName: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  nextWork: { fontSize: 20, fontWeight: '800', color: colors.text2, textAlign: 'center' },
  count: { flexDirection: 'row', alignItems: 'center', gap: space(4) },
  countValue: { minWidth: 96, fontSize: 72, fontWeight: '900', color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  countWords: { fontSize: 18, fontWeight: '700', color: colors.text2 },
  sets: { alignSelf: 'stretch', gap: space(2) },
  setsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space(2) },
  setCell: { flexBasis: '30%', flexGrow: 1, minWidth: 136, maxWidth: 200 },
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
