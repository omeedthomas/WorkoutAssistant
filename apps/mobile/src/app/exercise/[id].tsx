import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { exerciseById, tierOf, treeById } from '@ascent/core/data';
import { videos } from '@ascent/core/data/videos';
import { formatDate, formatTarget, formatWork } from '@ascent/core/lib/format';
import { meetsTarget, statusOf } from '@ascent/core/lib/graph';
import { planSession } from '@ascent/core/lib/progression';
import { fromUnits, loadStepKg, toUnits } from '@ascent/core/lib/units';
import { dayOf } from '@ascent/core/lib/history';
import { localDay, MAX_GOALS } from '@ascent/core/state/progress';
import { Button, Card, Screen, SectionTitle, Stepper, Tag } from '../../components/ui';
import { confirm, notify } from '../../lib/dialogs';
import { planKindColor, planKindLabel, setsText } from '../../lib/labels';
import { useProgress } from '../../state/ProgressContext';
import { colors, space, type } from '../../theme';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = exerciseById[id];
  const { state, log, deleteLog, master, unmaster, toggleGoal } = useProgress();
  const logs = state.logs[ex?.id] ?? [];
  const plan = useMemo(
    () => ex && planSession(ex, state.logs[ex.id], { mastered: !!state.mastered[ex.id], units: state.units }),
    [ex, state.logs, state.mastered, state.units],
  );

  const weighted = ex?.target.addedKg !== undefined;
  const [sets, setSets] = useState(plan?.sets ?? 3);
  const [value, setValue] = useState(plan?.value ?? 1);
  const [weight, setWeight] = useState(plan?.addedKg !== undefined ? toUnits(plan.addedKg, state.units) : 0);
  // Follow the plan when it changes (e.g. after logging).
  useEffect(() => {
    if (!plan) return;
    setSets(plan.sets);
    setValue(plan.value);
    if (plan.addedKg !== undefined) setWeight(toUnits(plan.addedKg, state.units));
  }, [plan, state.units]);

  if (!ex || !plan) return null;
  const tree = treeById[ex.tree];
  const status = statusOf(ex.id, state.mastered);
  const video = videos[ex.id];
  const isGoal = state.goals.includes(ex.id);
  const t = ex.target;
  const unit = t.unit === 'seconds' ? 's' : 'reps';

  const logIt = () => {
    const done = { sets, value, ...(weighted && { addedKg: fromUnits(weight, state.units) }) };
    const planned = { sets: plan.sets, value: plan.value, ...(weighted && { addedKg: plan.addedKg ?? 0 }) };
    log(ex.id, done, planned);
    if (!state.mastered[ex.id] && meetsTarget(ex, done)) {
      confirm('Target hit!', `You reached the ${formatTarget(t, { units: state.units })} target. Mark ${ex.name} mastered?`, 'Mark mastered', () =>
        markMastered(),
      );
    }
  };

  const markMastered = () => {
    const unlocked = master(ex.id, { includeAncestors: true });
    notify(`${ex.name} mastered`, unlocked.length ? `Unlocked ${unlocked.map((u) => u.name).join(', ')}` : undefined);
  };

  return (
    <Screen edges={[]}>
      <View style={{ gap: space(2) }}>
        <Text style={[type.eyebrow, { color: tree.color }]}>
          {tree.name} · {ex.trackName}
        </Text>
        <Text style={type.title}>{ex.name}</Text>
        <View style={{ flexDirection: 'row', gap: space(2), flexWrap: 'wrap' }}>
          <Tag label={`Level ${ex.level} · ${tierOf(ex.level)}`} />
          {status === 'mastered' && <Tag label="Mastered" color={colors.success} />}
          {status === 'locked' && <Tag label="Locked (you can still train it)" color={colors.text3} />}
          {isGoal && <Tag label="Goal" color={colors.gold} />}
        </View>
      </View>

      {video && (
        <Pressable role="button" onPress={() => void Linking.openURL(`https://www.youtube.com/watch?v=${video.youtubeId}`)}>
          <Card style={styles.row}>
            <Ionicons name="logo-youtube" size={32} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { fontWeight: '700' }]} numberOfLines={2}>
                {video.title}
              </Text>
              <Text style={type.small}>{video.channel} · opens YouTube</Text>
            </View>
          </Card>
        </Pressable>
      )}

      <Card>
        <Text style={type.eyebrow}>Target to master</Text>
        <Text style={type.title}>{formatTarget(t, { units: state.units })}</Text>
        {state.mastered[ex.id] && <Text style={[type.small, { color: colors.success }]}>Mastered {formatDate(state.mastered[ex.id])}</Text>}
      </Card>

      <Card accent={planKindColor(plan.kind)}>
        <View style={styles.row}>
          <Text style={[type.eyebrow, { flex: 1 }]}>{logs[0] && dayOf(logs[0]) === localDay() ? 'Next session' : "Today's plan"}</Text>
          <Tag label={planKindLabel[plan.kind]} color={planKindColor(plan.kind)} />
        </View>
        <Text style={type.title}>
          {setsText(plan.sets, plan.value, t.unit, t.perSide)}
          {plan.addedKg !== undefined ? `  +${toUnits(plan.addedKg, state.units)} ${state.units}` : ''}
        </Text>
        <Text style={type.body}>{plan.reason}</Text>
        {plan.tip && <Text style={type.small}>💡 {plan.tip}</Text>}
        <Text style={type.small}>Rest {plan.rest} between sets</Text>
      </Card>

      <Card>
        <Text style={type.eyebrow}>Log what you did</Text>
        <View style={styles.row}>
          <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={10} />
          <Stepper label={t.unit === 'seconds' ? 'Seconds' : 'Reps'} value={value} onChange={setValue} min={1} step={t.unit === 'seconds' ? 5 : 1} unit={t.unit === 'seconds' ? 's' : undefined} />
        </View>
        {weighted && (
          <Stepper label="Added weight" value={weight} onChange={setWeight} step={toUnits(loadStepKg(state.units), state.units)} unit={state.units} />
        )}
        <Button label={`Log ${sets} × ${value}${t.unit === 'seconds' ? 's' : ` ${unit}`}`} onPress={logIt} />
      </Card>

      {logs.length > 0 && (
        <>
          <SectionTitle>History</SectionTitle>
          <Card>
            {logs.slice(0, 10).map((l) => (
              <View key={l.id} style={styles.row}>
                <Text style={[type.small, { width: 80 }]}>{formatDate(l.date)}</Text>
                <Text style={[type.body, { flex: 1 }]}>{formatWork(ex, l, state.units)}</Text>
                <Pressable
                  role="button"
                  aria-label="Delete this session"
                  hitSlop={8}
                  onPress={() => confirm('Delete session?', formatWork(ex, l, state.units), 'Delete', () => deleteLog(ex.id, l.id), true)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.text3} />
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>How to</SectionTitle>
      <Card>
        <Text style={type.body}>{ex.description}</Text>
        {ex.cues.map((c) => (
          <Text key={c} style={type.body}>
            • {c}
          </Text>
        ))}
      </Card>

      {ex.requires.length > 0 && (
        <>
          <SectionTitle>Builds on</SectionTitle>
          <Card>
            {ex.requires.map((r) => (
              <Pressable role="button" key={r} onPress={() => router.push(`/exercise/${r}`)} style={styles.row}>
                <Ionicons
                  name={state.mastered[r] ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={state.mastered[r] ? colors.success : colors.text3}
                />
                <Text style={[type.body, { flex: 1 }]}>{exerciseById[r].name}</Text>
                <Text style={type.small}>{treeById[exerciseById[r].tree].name}</Text>
              </Pressable>
            ))}
          </Card>
        </>
      )}

      <View style={{ gap: space(2) }}>
        {state.mastered[ex.id] ? (
          <Button label="Unmark mastered" kind="secondary" onPress={() => unmaster(ex.id)} />
        ) : (
          <Button label="Mark mastered" kind="secondary" onPress={markMastered} />
        )}
        <Button
          label={isGoal ? 'Remove goal' : 'Set as goal'}
          kind="ghost"
          disabled={!isGoal && state.goals.length >= MAX_GOALS}
          onPress={() => toggleGoal(ex.id)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
});
