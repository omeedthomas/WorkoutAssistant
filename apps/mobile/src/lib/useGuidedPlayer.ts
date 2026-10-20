import { useEffect, useRef, useState } from 'react';
import {
  GET_READY_SECONDS,
  isLastOfItem,
  restAnnouncement,
  startAnnouncement,
  type GuidedStep,
} from '@ascent/core/lib/guided';
import { celebrate, speak, stopSpeaking, tap } from './coach';

/** Where the player is within the current step. Timed stages end at `endsAt` (ms since epoch). */
export type Stage =
  | { kind: 'ready'; endsAt: number; total: number }
  | { kind: 'work'; endsAt?: number; total?: number }
  | { kind: 'rest'; endsAt: number; total: number }
  | { kind: 'done' };

/** Shown during the rest after an exercise was logged. */
export interface LoggedNote {
  id: string;
  text: string;
  mastery: boolean;
}

interface Options {
  steps: GuidedStep[];
  start: number;
  voice: boolean;
  onPosition?: (index: number) => void;
  /** A drill or exercise is over (finished or skipped) after `sets` completed sets (at least 1). */
  onItemDone: (step: GuidedStep, sets: number) => LoggedNote | null;
  doneSpeech: string;
}

const entryStage = (s: GuidedStep): Stage =>
  s.seconds !== undefined
    ? { kind: 'ready', endsAt: Date.now() + GET_READY_SECONDS * 1000, total: GET_READY_SECONDS * 1000 }
    : { kind: 'work' };

/**
 * The guided workout's state machine (the same flow as the web app's player): timed steps get a get-ready
 * countdown and then a timer, rep steps wait for Done, and rest follows each set. Timers run off the clock,
 * so they stay right even if the phone briefly stalls.
 */
export function useGuidedPlayer({ steps, start, voice, onPosition, onItemDone, doneSpeech }: Options) {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, start), steps.length - 1));
  const [stage, setStage] = useState<Stage>(() => entryStage(steps[index]));
  const [now, setNow] = useState(() => Date.now());
  /** Time left when paused, in ms. */
  const [paused, setPaused] = useState<number | null>(null);
  const [justLogged, setJustLogged] = useState<LoggedNote | null>(null);
  const setsDone = useRef(new Map<number, number>());
  const spoken = useRef('');

  const step = steps[index];
  const next = steps[index + 1];
  const endsAt = stage.kind === 'done' ? undefined : stage.endsAt;
  const remainingMs = paused ?? (endsAt === undefined ? null : endsAt - now);
  const left = remainingMs === null ? null : Math.ceil(remainingMs / 1000);

  const go = (s: Stage) => {
    setNow(Date.now());
    setStage(s);
  };

  const startStep = (i: number) => {
    setIndex(i);
    onPosition?.(i);
    setPaused(null);
    setJustLogged(null);
    go(entryStage(steps[i]));
    speak(startAnnouncement(steps[i]), voice);
    tap();
  };

  const settleItem = (s: GuidedStep) => {
    const done = setsDone.current.get(s.item) ?? 0;
    if (!done) return;
    const note = onItemDone(s, done);
    if (note) setJustLogged(note);
  };

  const finishAll = () => {
    setPaused(null);
    go({ kind: 'done' });
    speak(doneSpeech, voice);
    celebrate();
  };

  /** Ends the current step: counts it if you did it, then rests (or moves straight on). */
  const finishStep = (completed: boolean) => {
    if (completed && (step.side?.index ?? 1) === 1) setsDone.current.set(step.item, (setsDone.current.get(step.item) ?? 0) + 1);
    if (isLastOfItem(steps, index)) settleItem(step);
    if (!next) return finishAll();
    const rest = completed ? step.rest : 0;
    if (rest > 0) {
      setPaused(null);
      go({ kind: 'rest', endsAt: Date.now() + rest * 1000, total: rest * 1000 });
      speak(restAnnouncement(rest, next), voice);
      tap();
    } else {
      startStep(index + 1);
    }
  };

  /** Skips the rest of this drill or exercise. Sets you already did still get logged. */
  const skipItem = () => {
    settleItem(step);
    const j = steps.findIndex((s, i) => i > index && s.item !== step.item);
    if (j < 0) finishAll();
    else startStep(j);
  };

  const back = () => startStep(stage.kind === 'rest' || stage.kind === 'done' ? index : Math.max(0, index - 1));

  const togglePause = () => {
    if (endsAt === undefined) return;
    if (paused === null) {
      setPaused(Math.max(0, endsAt - Date.now()));
      stopSpeaking();
    } else {
      go({ ...stage, endsAt: Date.now() + paused } as Stage);
      setPaused(null);
    }
  };

  const addRest = (seconds: number) => {
    if (stage.kind !== 'rest') return;
    if (paused !== null) setPaused(paused + seconds * 1000);
    go({ ...stage, endsAt: stage.endsAt + seconds * 1000, total: stage.total + seconds * 1000 });
  };

  const skipRest = () => stage.kind === 'rest' && startStep(index + 1);

  // Announce the first step when the player opens.
  useEffect(() => {
    onPosition?.(index);
    speak(startAnnouncement(steps[index]), voice);
    return stopSpeaking;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick while a timer runs.
  const running = paused === null && endsAt !== undefined;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [running]);

  // Countdowns, spoken cues and moving on when a timer runs out.
  useEffect(() => {
    if (paused !== null || left === null || stage.kind === 'done') return;
    if (left <= 0) {
      if (stage.kind === 'ready') {
        go({ kind: 'work', endsAt: Date.now() + step.seconds! * 1000, total: step.seconds! * 1000 });
        speak('Go!', voice);
        tap();
      } else if (stage.kind === 'work') {
        finishStep(true);
      } else {
        startStep(index + 1);
      }
      return;
    }
    const key = `${index}:${stage.kind}:${left}`;
    if (spoken.current === key) return;
    spoken.current = key;
    const countdown = stage.kind !== 'rest' || next?.seconds === undefined;
    if (left <= 3 && countdown) speak(String(left), voice, { interrupt: false });
    else if (stage.kind === 'work' && step.seconds! >= 30 && left === 10) speak('10 seconds left', voice);
    else if (stage.kind === 'work' && step.seconds! >= 60 && left === Math.round(step.seconds! / 2)) speak('Halfway', voice);
  }, [left, stage, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = stage.kind === 'done' ? 1 : (index + (stage.kind === 'rest' ? 1 : 0)) / steps.length;

  return { index, step, next, stage, left, paused, justLogged, progress, finishStep, skipItem, back, togglePause, addRest, skipRest };
}
