import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Pause,
  Play,
  Plus,
  SkipForward,
  Trophy,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { exerciseById, treeById } from '@ascent/core/data';
import type { ExerciseVideo } from '@ascent/core/data/videos';
import { speak, speechSupported, setGuidePrefs, stopSpeaking, unlockSpeech, useGuidePrefs } from '../lib/announcer';
import { pct } from '@ascent/core/lib/format';
import {
  clock,
  GET_READY_SECONDS,
  isLastOfItem,
  restAnnouncement,
  startAnnouncement,
  workLabel,
  type GuidedPhase,
  type GuidedStep,
} from '@ascent/core/lib/guided';
import { SetsEditor } from './SetsEditor';

/** Shown during the rest after an exercise was logged, with a prompt if it hit the mastery target. */
export interface LoggedNote {
  id: string;
  text: string;
  mastery: boolean;
}

interface Props {
  /** For screen readers, e.g. "Guided workout". */
  label: string;
  /** Accent for drills (exercises use their tree's colour). */
  color?: string;
  steps: GuidedStep[];
  /** Step to start at. */
  start: number;
  onPosition?: (index: number) => void;
  /**
   * A drill or exercise is over (finished or skipped), with each completed set's reps or seconds (at least one
   * set). Called again with the corrected sets if you fix one afterwards, while resting.
   */
  onItemDone: (step: GuidedStep, sets: number[]) => LoggedNote | null | void;
  /** Sets already done, by item (e.g. exercises logged from the list), so redoing one keeps the others. */
  initialSets?: Record<number, number[]>;
  /** Extra choices for the step you're on, e.g. switching to an easier exercise. */
  stepActions?: (step: GuidedStep) => { label: string; onClick: () => void }[];
  onMaster?: (exerciseId: string) => void;
  /** Leaves the player, e.g. "Show list". */
  exit: { label: string; icon: ReactNode; onClick: () => void };
  /** Said out loud at the end. */
  doneSpeech: string;
  /** Called once when the last step is finished. */
  onComplete?: () => void;
  /** The finish screen. */
  done: { eyebrow: string; title: string; body: ReactNode; finishLabel: string; onFinish: () => void };
}

/** Where the player is within the current step. Timed stages end at `endsAt` (ms); `total` drives the ring. */
type Stage =
  | { kind: 'ready'; endsAt: number; total: number }
  | { kind: 'work'; endsAt?: number; total?: number }
  | { kind: 'rest'; endsAt: number; total: number }
  | { kind: 'done' };

const PHASE_LABEL: Record<GuidedPhase, string> = {
  warmup: 'Warm-up',
  main: 'Main work',
  cooldown: 'Cooldown',
  mobility: 'Daily mobility',
};

/** How a step begins: timed steps with a get-ready countdown, rep steps straight away. */
const entryStage = (s: GuidedStep): Stage =>
  s.seconds !== undefined
    ? { kind: 'ready', endsAt: Date.now() + GET_READY_SECONDS * 1000, total: GET_READY_SECONDS * 1000 }
    : { kind: 'work' };

/**
 * Plays guided steps (a started workout or a mobility routine) one at a time: a looping demo video, the reps
 * to do (tap Done) or a timer (after a get-ready countdown), then rest before the next set. The announcer
 * reads each part out loud.
 */
export function GuidedPlayer({
  label,
  color,
  steps,
  start,
  onPosition,
  onItemDone,
  initialSets,
  stepActions,
  onMaster,
  exit,
  doneSpeech,
  onComplete,
  done: finish,
}: Props) {
  const prefs = useGuidePrefs();
  const [index, setIndex] = useState(() => Math.min(Math.max(0, start), steps.length - 1));
  const [stage, setStage] = useState<Stage>(() => entryStage(steps[index]));
  const [now, setNow] = useState(() => Date.now());
  /** Time left when paused, in ms. */
  const [paused, setPaused] = useState<number | null>(null);
  const [justLogged, setJustLogged] = useState<LoggedNote | null>(null);
  /** Each completed set's reps (or seconds) per item, by set number (a set not done is a gap), for logging what you actually did. */
  const [setsDone, setSetsDone] = useState<Record<number, (number | undefined)[]>>(() => ({ ...initialSets }));
  /** Items already handed to onItemDone, so a correction is passed on too. */
  const settled = useRef(new Set<number>());
  /** Reps you did in the current set, when you change them from the plan. */
  const [reps, setReps] = useState<number | null>(null);
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
    const s = steps[i];
    setIndex(i);
    onPosition?.(i);
    setPaused(null);
    setJustLogged(null);
    setReps(null);
    go(entryStage(s));
    speak(startAnnouncement(s));
  };

  /** Hands a finished drill or exercise (with the sets you completed) to the owner, e.g. to log it. */
  const settleItem = (s: GuidedStep, sets = setsDone[s.item]) => {
    const done = (sets ?? []).filter((v) => v !== undefined);
    if (!done.length) return;
    settled.current.add(s.item);
    const note = onItemDone(s, done);
    if (note) setJustLogged(note);
  };

  /** Fixes a finished set's reps or seconds while resting, e.g. you tapped Done but only got 9. */
  const correctSets = (s: GuidedStep, sets: (number | undefined)[]) => {
    setSetsDone({ ...setsDone, [s.item]: sets });
    if (settled.current.has(s.item)) settleItem(s, sets);
  };

  const finishAll = () => {
    setPaused(null);
    go({ kind: 'done' });
    speak(doneSpeech);
    onComplete?.();
  };

  /** Ends the current step: counts it if you did it, then rests (or moves straight on). */
  const finishStep = (completed: boolean) => {
    let sets = setsDone[step.item];
    // A set counts once both sides are done. Doing it again (after going back) replaces it.
    if (completed && (step.side?.index ?? 1) === 1) {
      sets = [...(sets ?? [])];
      sets[step.set - 1] = step.kind === 'exercise' ? (reps ?? step.value ?? 1) : 1;
      setSetsDone({ ...setsDone, [step.item]: sets });
    }
    if (isLastOfItem(steps, index)) settleItem(step, sets);
    if (!next) return finishAll();
    const rest = completed ? step.rest : 0;
    if (rest > 0) {
      setPaused(null);
      go({ kind: 'rest', endsAt: Date.now() + rest * 1000, total: rest * 1000 });
      speak(restAnnouncement(rest, next));
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

  // Announce the first step when the player opens.
  useEffect(() => {
    onPosition?.(index);
    speak(startAnnouncement(steps[index]));
    return stopSpeaking;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick while a timer runs.
  const running = paused === null && endsAt !== undefined;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [running]);

  // Countdowns, spoken cues and moving on when a timer runs out.
  useEffect(() => {
    if (paused !== null || left === null || stage.kind === 'done') return;
    if (left <= 0) {
      if (stage.kind === 'ready') {
        go({ kind: 'work', endsAt: Date.now() + step.seconds! * 1000, total: step.seconds! * 1000 });
        speak('Go!');
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
    // Before a timed step the get-ready countdown does the counting, so rest only counts down into rep steps.
    const countdown = stage.kind !== 'rest' || next?.seconds === undefined;
    if (left <= 3 && countdown) speak(String(left), { interrupt: false, ifIdle: true });
    else if (stage.kind === 'work' && step.seconds! >= 30 && left === 10) speak('10 seconds left', { ifIdle: true });
    else if (stage.kind === 'work' && step.seconds! >= 60 && left === Math.round(step.seconds! / 2)) speak('Halfway', { ifIdle: true });
  }, [left, stage, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the screen on while you work out.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        // not supported or not allowed: the screen may dim as usual
      }
    };
    void request();
    const onVisible = () => document.visibilityState === 'visible' && void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, []);

  const tree = step.kind === 'exercise' ? treeById[exerciseById[step.id].tree] : null;
  // While resting, show what's coming up.
  const shown = stage.kind === 'rest' && next ? next : step;
  const phaseItems = [...new Set(steps.filter((s) => s.phase === shown.phase).map((s) => s.item))];
  const progress = stage.kind === 'done' ? 1 : (index + (stage.kind === 'rest' ? 1 : 0)) / steps.length;
  const tap = (fn: () => void) => () => {
    unlockSpeech();
    fn();
  };

  if (stage.kind === 'done') {
    return (
      <section className="guided guided--done" aria-label={label}>
        <GuidedHeader eyebrow={finish.eyebrow} progress={1} exit={exit} />
        <div className="card guided-finish">
          <span className="guided-finish__icon" aria-hidden>
            <Trophy size={30} />
          </span>
          <h2>{finish.title}</h2>
          <div className="muted">{finish.body}</div>
          <div className="guided-controls">
            <button className="btn" onClick={back}>
              <ChevronLeft size={18} aria-hidden /> Back
            </button>
            <button className="btn btn--primary btn--lg" onClick={finish.onFinish}>
              <Check size={18} aria-hidden /> {finish.finishLabel}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="guided" aria-label={label} style={{ '--tree': tree?.color ?? color ?? 'var(--accent)' } as CSSProperties}>
      <GuidedHeader
        eyebrow={`${PHASE_LABEL[shown.phase]} · ${phaseItems.indexOf(shown.item) + 1} of ${phaseItems.length}`}
        progress={progress}
        exit={exit}
      />

      <div className="guided__layout">
        <DemoVideo video={shown.video} play={prefs.video} label={stage.kind === 'rest' ? 'Up next' : undefined} />
        <div className="guided__title">
          <h2>{shown.name}</h2>
          <p className="guided__set">
            {shown.sets > 1 && <span>Set {shown.set} of {shown.sets}</span>}
            {/* Resting, the panel shows the rest timer, so say here how much the next set is. */}
            {stage.kind === 'rest' && <strong>{workLabel(shown)}</strong>}
            {shown.side && <span>{shown.side.label}</span>}
            {shown.load && <span>{shown.load.text}</span>}
          </p>
        </div>
        <div className="guided__about">
          <p className="guided__cue">{shown.cue}</p>
          {shown.setup && (
            <p className="wx-card__setup">
              <Wrench size={14} aria-hidden /> {shown.setup}
            </p>
          )}
        </div>

        <div className="guided__panel card">
          {stage.kind === 'ready' && (
            <>
              <Ring fraction={remainingMs! / stage.total} tone="ready" label={`Get ready, starting in ${left} seconds`}>
                <span className="guided-ring__big">{Math.max(1, left!)}</span>
                <span className="guided-ring__small">{step.side?.index === 1 ? 'Switch sides' : 'Get ready'}</span>
              </Ring>
              <div className="guided-controls">
                <button className="btn" onClick={tap(back)} aria-label="Previous step">
                  <ChevronLeft size={18} aria-hidden />
                </button>
                <button
                  className="btn btn--primary btn--lg"
                  onClick={tap(() => {
                    go({ kind: 'work', endsAt: Date.now() + step.seconds! * 1000, total: step.seconds! * 1000 });
                    setPaused(null);
                    speak('Go!');
                  })}
                >
                  <Play size={18} aria-hidden /> Start now
                </button>
              </div>
            </>
          )}

          {stage.kind === 'work' && step.seconds !== undefined && (
            <>
              <Ring fraction={remainingMs! / stage.total!} tone="work" label={`${left} seconds left`}>
                <span className="guided-ring__big">{clock(remainingMs! / 1000)}</span>
                <span className="guided-ring__small">{paused !== null ? 'Paused' : 'Keep going'}</span>
              </Ring>
              <div className="guided-controls">
                <button className="btn" onClick={tap(back)} aria-label="Previous step">
                  <ChevronLeft size={18} aria-hidden />
                </button>
                <button className="btn btn--primary btn--lg" onClick={tap(togglePause)}>
                  {paused !== null ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
                  {paused !== null ? 'Resume' : 'Pause'}
                </button>
                <button className="btn" onClick={tap(() => finishStep(true))} aria-label="Finish this set now">
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>
            </>
          )}

          {stage.kind === 'work' && step.seconds === undefined && (
            <>
              {step.kind === 'exercise' && step.value !== undefined ? (
                <RepCounter step={step} value={reps ?? step.value} onChange={setReps} />
              ) : (
                <div className="guided-reps" role="status">
                  <span className="guided-reps__big">{step.reps?.match(/^\d+/)?.[0] ?? '✓'}</span>
                  <span className="guided-reps__small">{step.reps?.replace(/^\d+\s*/, '')}</span>
                </div>
              )}
              <div className="guided-controls">
                <button className="btn" onClick={tap(back)} aria-label="Previous step">
                  <ChevronLeft size={18} aria-hidden />
                </button>
                <button className="btn btn--primary btn--lg guided-controls__main" onClick={tap(() => finishStep(true))}>
                  <Check size={18} aria-hidden /> Done
                </button>
              </div>
            </>
          )}

          {stage.kind === 'rest' && (
            <>
              <Ring fraction={remainingMs! / stage.total} tone="rest" label={`Rest, ${left} seconds left`}>
                <span className="guided-ring__big">{clock(remainingMs! / 1000)}</span>
                <span className="guided-ring__small">{paused !== null ? 'Paused' : 'Rest'}</span>
              </Ring>
              {step.kind === 'exercise' && setsDone[step.item]?.some((v) => v !== undefined) && (
                <div className="guided-sets">
                  <p className="small">
                    <strong>Your sets of {step.name}</strong> <span className="muted">· fix any that went differently</span>
                  </p>
                  <SetsEditor
                    values={setsDone[step.item]}
                    unit={step.seconds !== undefined ? 'seconds' : 'reps'}
                    onChange={(sets) => correctSets(step, sets)}
                  />
                </div>
              )}
              {justLogged && (
                <LoggedBanner
                  logged={justLogged}
                  onMaster={() => {
                    onMaster?.(justLogged.id);
                    setJustLogged({ ...justLogged, mastery: false });
                  }}
                />
              )}
              <div className="guided-controls">
                <button className="btn" onClick={tap(() => addRest(15))}>
                  <Plus size={16} aria-hidden /> 15 s
                </button>
                <button className="btn" onClick={tap(togglePause)} aria-label={paused !== null ? 'Resume rest' : 'Pause rest'}>
                  {paused !== null ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
                </button>
                <button className="btn btn--primary btn--lg" onClick={tap(() => startStep(index + 1))}>
                  <SkipForward size={18} aria-hidden /> Skip rest
                </button>
              </div>
            </>
          )}

          <UpNext stage={stage} step={step} next={next} />
          {stage.kind !== 'rest' && (
            <div className="guided__actions">
              {stepActions?.(step).map((a) => (
                <button key={a.label} className="btn btn--sm guided__action" onClick={tap(a.onClick)}>
                  {a.label}
                </button>
              ))}
              <button className="link-btn guided__skip" onClick={tap(skipItem)}>
                Skip {step.kind === 'drill' ? 'this drill' : 'this exercise'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function GuidedHeader({ eyebrow, progress, exit }: { eyebrow: string; progress: number; exit: Props['exit'] }) {
  return (
    <header className="guided__head">
      <div className="guided__head-row">
        <span className="eyebrow">{eyebrow}</span>
        <AnnouncerToggles />
        <button className="btn btn--sm" onClick={exit.onClick}>
          {exit.icon} {exit.label}
        </button>
      </div>
      <span className="meter" aria-hidden>
        <span style={{ width: pct(progress) }} />
      </span>
    </header>
  );
}

/** The speaker and video switches, always one tap away during a workout. */
function AnnouncerToggles() {
  const prefs = useGuidePrefs();
  const canSpeak = speechSupported();
  return (
    <div className="guided__toggles" role="group" aria-label="Workout sound and video">
      <button
        className="icon-btn guided__toggle"
        aria-pressed={canSpeak && prefs.voice}
        disabled={!canSpeak}
        title={canSpeak ? (prefs.voice ? 'Mute the announcer' : 'Unmute the announcer') : "This browser can't read announcements out loud"}
        aria-label={prefs.voice ? 'Mute the announcer' : 'Unmute the announcer'}
        onClick={() => {
          setGuidePrefs({ voice: !prefs.voice });
          if (!prefs.voice) speak('Announcer on');
        }}
      >
        {canSpeak && prefs.voice ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>
      <button
        className="icon-btn guided__toggle"
        aria-pressed={prefs.video}
        title={prefs.video ? 'Stop the demo videos' : 'Play the demo videos'}
        aria-label={prefs.video ? 'Stop the demo videos' : 'Play the demo videos'}
        onClick={() => setGuidePrefs({ video: !prefs.video })}
      >
        {prefs.video ? <Video size={20} /> : <VideoOff size={20} />}
      </button>
    </div>
  );
}

/**
 * A muted demo that loops for as long as the step lasts. With videos off (or no video) it's the still
 * thumbnail, so nothing is loaded from YouTube's player.
 */
function DemoVideo({ video, play, label }: { video?: ExerciseVideo; play: boolean; label?: string }) {
  if (!video) return <div className="guided-video guided-video--empty" />;
  const id = video.youtubeId;
  const params = `autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&disablekb=1`;
  return (
    <div className="guided-video">
      {play ? (
        <iframe
          key={id}
          src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
          title={`Demo: ${video.title}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
        />
      ) : (
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" />
      )}
      {label && <span className="guided-video__label">{label}</span>}
    </div>
  );
}

function Ring({ fraction, tone, label, children }: { fraction: number; tone: 'ready' | 'work' | 'rest'; label: string; children: ReactNode }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <div className={`guided-ring guided-ring--${tone}`} role="timer" aria-label={label}>
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle className="guided-ring__track" cx="60" cy="60" r={r} />
        <circle className="guided-ring__fill" cx="60" cy="60" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - f)} />
      </svg>
      <span className="guided-ring__label">{children}</span>
    </div>
  );
}

function UpNext({ stage, step, next }: { stage: Stage; step: GuidedStep; next?: GuidedStep }) {
  if (stage.kind === 'rest') {
    return next?.seconds !== undefined ? (
      <p className="guided__next small muted">A {GET_READY_SECONDS}-second countdown starts the timer after your rest.</p>
    ) : (
      <p className="guided__next small muted">Tap Done when you finish each set. Did more or fewer reps? Change the number first.</p>
    );
  }
  if (!next) return <p className="guided__next small muted">Last one!</p>;
  const set = next.sets > 1 ? ` · set ${next.set} of ${next.sets}` : '';
  const rest = step.rest > 0 ? `${clock(step.rest)} rest, then ` : '';
  return (
    <p className="guided__next small muted">
      Next: {rest}
      <strong>{next.name}</strong>
      {next.side?.index === 1 ? ` · ${next.side.label.toLowerCase()}` : `${set} · ${workLabel(next)}`}
    </p>
  );
}

/** This set's reps, big, with − and + to log what you actually did before tapping Done. */
function RepCounter({ step, value, onChange }: { step: GuidedStep; value: number; onChange: (n: number) => void }) {
  const words = step.reps?.replace(/^\d+\s*/, '').replace(/^reps?\b/, value === 1 ? 'rep' : 'reps');
  return (
    <div className="guided-count">
      <button type="button" className="guided-count__btn" aria-label="One rep fewer" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus size={24} aria-hidden />
      </button>
      <div className="guided-reps" role="status" aria-live="polite">
        <span className="guided-reps__big">{value}</span>
        <span className="guided-reps__small">{words}</span>
        {value !== step.value && <span className="guided-reps__plan">Planned {step.value}</span>}
      </div>
      <button type="button" className="guided-count__btn" aria-label="One rep more" disabled={value >= 200} onClick={() => onChange(value + 1)}>
        <Plus size={24} aria-hidden />
      </button>
    </div>
  );
}

function LoggedBanner({ logged, onMaster }: { logged: LoggedNote; onMaster: () => void }) {
  return (
    <div className="guided__logged">
      <span className="wx-logged__text">
        <Check size={15} aria-hidden /> Logged {logged.text}
      </span>
      {logged.mastery && (
        <div className="callout callout--success">
          <strong>Mastery target hit!</strong>
          <button className="btn btn--primary btn--sm" onClick={onMaster}>
            Mark mastered
          </button>
        </div>
      )}
    </div>
  );
}
