import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft, Check, Clock, Flame, Play, X } from 'lucide-react';
import { DailyMobility, startRoutine, takeAutostart } from '../components/DailyMobility';
import { DrillRow } from '../components/DrillRow';
import { GuidedPlayer } from '../components/GuidedPlayer';
import { useToast } from '../components/Toast';
import { drillById } from '../data/drills';
import { routineById, routineMinutes, routines, type Routine } from '../data/routines';
import { unlockSpeech } from '../lib/announcer';
import { DEFAULT_BODY_KG, routineCalories } from '../lib/calories';
import { firstStepOf, routineSteps } from '../lib/guided';
import { bodyWeightOn } from '../lib/history';
import { routinesDoneOn } from '../lib/routines';
import { localDay } from '../state/progress';
import { useProgress } from '../state/ProgressContext';

const scrollToTop = () => document.querySelector('.app-main')?.scrollTo({ top: 0 });

/** Daily mobility: every routine (`#/mobility`), or one routine with its moves and the player (`#/mobility/<id>`). */
export function MobilityPage({ routine }: { routine?: string }) {
  return routine ? <RoutinePage key={routine} routine={routineById[routine]} /> : <RoutineList />;
}

function RoutineList() {
  const { state } = useProgress();
  const done = new Set(routinesDoneOn(state, localDay()));
  const kg = bodyWeightOn(state) ?? DEFAULT_BODY_KG;
  return (
    <div className="page mobility-page">
      <header className="page-header">
        <h1>Daily mobility</h1>
        <p className="muted">
          Short follow-along routines to loosen up and start the day. Press Start and a demo video, timers and the
          announcer take you through each move. All you need is the floor, a wall, a chair and a towel.
        </p>
      </header>
      <DailyMobility />
      <div className="routine-grid">
        {routines.map((r) => (
          <article key={r.id} className="card routine-card" style={{ '--routine': r.color } as CSSProperties}>
            <span className="eyebrow">
              {routineMinutes(r)} min · {r.moves.length} moves · about {routineCalories(r, kg)} kcal
            </span>
            <h2>
              <a href={`#/mobility/${r.id}`}>{r.name}</a>
              {done.has(r.id) && (
                <span className="tag tag--done">
                  <Check size={12} aria-hidden /> Done today
                </span>
              )}
            </h2>
            <p className="muted small">{r.description}</p>
            <div className="chips">
              {r.areas.map((a) => (
                <span key={a} className="chip">
                  {a}
                </span>
              ))}
            </div>
            <div className="button-row">
              <button className="btn btn--primary" onClick={() => startRoutine(r.id)}>
                <Play size={16} aria-hidden /> Start
              </button>
              <a href={`#/mobility/${r.id}`} className="btn">
                See the moves
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RoutinePage({ routine }: { routine: Routine }) {
  const { state, recordWorkout, finishWorkout } = useProgress();
  const toast = useToast();
  const steps = useMemo(() => routineSteps(routine), [routine]);
  const kcal = routineCalories(routine, bodyWeightOn(state) ?? DEFAULT_BODY_KG);
  const doneToday = routinesDoneOn(state, localDay()).includes(routine.id);
  // Playing: when it started (for the History record) and the step to begin at.
  const [playing, setPlaying] = useState<{ startedAt: string; start: number } | null>(() =>
    takeAutostart(routine.id) ? { startedAt: new Date().toISOString(), start: 0 } : null,
  );

  const play = (start = 0) => {
    unlockSpeech();
    setPlaying({ startedAt: new Date().toISOString(), start });
    scrollToTop();
  };

  const record = () => {
    if (!playing) return;
    recordWorkout({ title: `Daily mobility: ${routine.name}`, focus: ['mobility'], length: 'short', startedAt: playing.startedAt, routine: routine.id });
    finishWorkout(playing.startedAt, kcal);
    toast('Daily mobility done', `${routine.name} is in your History.`);
  };

  if (playing) {
    return (
      <div className="page mobility-page page--guided">
        <header className="page-header">
          <span className="eyebrow">Daily mobility</span>
          <h1>{routine.name}</h1>
        </header>
        <GuidedPlayer
          label="Mobility routine"
          color={routine.color}
          steps={steps}
          start={playing.start}
          onItemDone={() => null}
          exit={{ label: 'Exit', icon: <X size={16} aria-hidden />, onClick: () => setPlaying(null) }}
          doneSpeech="Routine complete. Have a great day!"
          onComplete={record}
          done={{
            eyebrow: 'Routine complete',
            title: 'Nice start to the day!',
            body: (
              <p>
                {routine.name} · {routineMinutes(routine)} min · about {kcal} kcal.
              </p>
            ),
            finishLabel: 'Done',
            onFinish: () => {
              setPlaying(null);
              scrollToTop();
            },
          }}
        />
      </div>
    );
  }

  const others = routines.filter((r) => r.id !== routine.id);
  return (
    <div className="page mobility-page" style={{ '--routine': routine.color } as CSSProperties}>
      <a href="#/mobility" className="link-btn mobility-back">
        <ArrowLeft size={14} aria-hidden /> All routines
      </a>
      <header className="page-header routine-header">
        <span className="eyebrow">Daily mobility</span>
        <h1>{routine.name}</h1>
        <p className="muted">{routine.description}</p>
        <p className="routine-meta small">
          <span>
            <Clock size={14} aria-hidden /> {routineMinutes(routine)} min
          </span>
          <span>
            <Flame size={14} aria-hidden /> about {kcal} kcal
          </span>
          <span>{routine.moves.length} moves</span>
          {doneToday && (
            <span className="tag tag--done">
              <Check size={12} aria-hidden /> Done today
            </span>
          )}
        </p>
        <div className="chips">
          {routine.areas.map((a) => (
            <span key={a} className="chip">
              {a}
            </span>
          ))}
        </div>
      </header>

      <div className="card routine-start">
        <button className="btn btn--primary btn--lg" onClick={() => play()}>
          <Play size={18} aria-hidden /> {doneToday ? 'Do it again' : 'Start routine'}
        </button>
        <p className="muted small">
          Each move plays a looping demo. Timed moves start after a 5-second countdown and switch sides for you; for the
          others, tap Done when you've finished. The announcer reads it all out (mute it with the speaker button).
        </p>
      </div>

      <section className="card">
        <h2>The moves</h2>
        <ul className="drill-list">
          {routine.moves.map((id) => (
            <DrillRow key={id} drill={drillById[id]} onPlay={() => play(firstStepOf(steps, 'drill', id))} />
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Other routines</h2>
        <ul className="mobility-chips">
          {others.map((r) => (
            <li key={r.id}>
              <a href={`#/mobility/${r.id}`} className="mobility-chip" style={{ '--routine': r.color } as CSSProperties}>
                <span className="dot" aria-hidden />
                {r.short}
                <span className="mobility-chip__min">{routineMinutes(r)} min</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
