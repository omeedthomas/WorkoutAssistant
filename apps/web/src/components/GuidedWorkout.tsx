import { useMemo, useState } from 'react';
import { List } from 'lucide-react';
import { exerciseById } from '@ascent/core/data';
import { formatWork } from '@ascent/core/lib/format';
import { meetsTarget } from '@ascent/core/lib/graph';
import { guidedSteps, type GuidedStep } from '@ascent/core/lib/guided';
import { setValues, workFromSets } from '@ascent/core/lib/sets';
import { easierStep, useActiveWorkout } from '../state/activeWorkout';
import { useProgress } from '../state/ProgressContext';
import { GuidedPlayer } from './GuidedPlayer';
import { useToast } from './Toast';
import { feedbackItems, NO_FEEDBACK, WorkoutFeedback, type Feedback } from './WorkoutFeedback';

type Session = ReturnType<typeof useActiveWorkout>;

/**
 * A started workout in the guided player. Finished exercises are logged (the sets you completed) and drills
 * ticked off, just like in the list, and the player picks up where you left off. Its owner remounts it (a `key`
 * of the exercise ids) when an exercise is switched, so the steps and the starting point are worked out again.
 */
export function GuidedWorkout({ session, kcal, onFinish }: { session: Session; kcal: number; onFinish: (feedback: Feedback) => void }) {
  const active = session.active!;
  const { state, log, editLog, master } = useProgress();
  const toast = useToast();
  const [feedback, setFeedback] = useState<Feedback>(NO_FEEDBACK);
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

  // Exercises already logged (from the list, or earlier in the player), so redoing one set keeps the others.
  const initialSets = useMemo(() => {
    const sets: Record<number, number[]> = {};
    for (const s of steps) {
      const logged = s.kind === 'exercise' && active.main.find((m) => m.exerciseId === s.id)?.logged;
      if (logged) sets[s.item] = setValues(logged);
    }
    return sets;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Logs a finished exercise as each set went, or corrects it if it's already logged. Drills are ticked off. */
  const onItemDone = (s: GuidedStep, sets: number[]) => {
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

  /** Too hard? Switch to the step below it in its progression (or back to the one it replaced). */
  const stepActions = (s: GuidedStep) => {
    const m = s.kind === 'exercise' ? active.main.find((x) => x.exerciseId === s.id) : undefined;
    if (!m || m.logged) return [];
    const easier = easierStep(active, s.id, state.equipment?.have ?? null);
    const original = m.swappedFrom && exerciseById[m.swappedFrom.exerciseId];
    return [
      ...(easier ? [{ label: `Too hard? Switch to ${easier.name}`, onClick: () => session.swap(s.id, easier.id, state) }] : []),
      ...(original ? [{ label: `Back to ${original.name}`, onClick: () => session.swap(s.id, original.id, state) }] : []),
    ];
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
      initialSets={initialSets}
      stepActions={stepActions}
      onMaster={onMaster}
      exit={{ label: 'Show list', icon: <List size={16} aria-hidden />, onClick: () => session.setGuided(false) }}
      doneSpeech="Workout complete. Great job!"
      done={{
        eyebrow: 'Workout complete',
        title: 'Great job!',
        body: (
          <>
            <p>
              {logged} of {active.main.length} exercises logged · about {kcal} kcal burned.
            </p>
            <WorkoutFeedback items={feedbackItems(active, state.units)} value={feedback} onChange={setFeedback} />
          </>
        ),
        finishLabel: 'Finish workout',
        onFinish: () => onFinish(feedback),
      }}
    />
  );
}
