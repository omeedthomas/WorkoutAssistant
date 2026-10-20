import { useMemo } from 'react';
import { List } from 'lucide-react';
import { exerciseById } from '@ascent/core/data';
import { formatWork } from '@ascent/core/lib/format';
import { meetsTarget } from '@ascent/core/lib/graph';
import { guidedSteps, type GuidedStep } from '@ascent/core/lib/guided';
import { useActiveWorkout } from '../state/activeWorkout';
import { useProgress } from '../state/ProgressContext';
import { GuidedPlayer } from './GuidedPlayer';
import { useToast } from './Toast';

type Session = ReturnType<typeof useActiveWorkout>;

/**
 * A started workout in the guided player. Finished exercises are logged (the sets you completed) and drills
 * ticked off, just like in the list, and the player picks up where you left off.
 */
export function GuidedWorkout({ session, kcal, onFinish }: { session: Session; kcal: number; onFinish: () => void }) {
  const active = session.active!;
  const { state, log, master } = useProgress();
  const toast = useToast();
  // The workout is a snapshot, so its steps only change if you switch units.
  const steps = useMemo(() => guidedSteps(active, state.units), [active.startedAt, state.units]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start where you left off, skipping anything already done from the list.
  const start = useMemo(() => {
    const from = Math.min(active.position, steps.length - 1);
    const done = (s: GuidedStep) =>
      s.kind === 'drill' ? active.checked.includes(s.id) : !!active.main.find((m) => m.exerciseId === s.id)?.logged;
    const first = steps.findIndex((s, i) => i >= from && !done(s));
    return first < 0 ? from : first;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onItemDone = (s: GuidedStep, sets: number) => {
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

  const onMaster = (id: string) => {
    const ex = exerciseById[id];
    const unlocked = master(id, { includeAncestors: true });
    toast(`${ex.name} mastered`, unlocked.length ? `Unlocked ${unlocked.map((u) => u.name).join(', ')}` : undefined);
  };

  const logged = active.main.filter((m) => m.logged).length;
  return (
    <GuidedPlayer
      label="Guided workout"
      steps={steps}
      start={start}
      onPosition={session.setPosition}
      onItemDone={onItemDone}
      onMaster={onMaster}
      exit={{ label: 'Show list', icon: <List size={16} aria-hidden />, onClick: () => session.setGuided(false) }}
      doneSpeech="Workout complete. Great job!"
      done={{
        eyebrow: 'Workout complete',
        title: 'Great job!',
        body: (
          <p>
            {logged} of {active.main.length} exercises logged · about {kcal} kcal burned.
          </p>
        ),
        finishLabel: 'Finish workout',
        onFinish,
      }}
    />
  );
}
