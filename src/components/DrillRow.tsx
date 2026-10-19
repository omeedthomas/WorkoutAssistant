import { useState } from 'react';
import { Circle, CircleCheck, Play, Timer } from 'lucide-react';
import { drillVideo, type Drill } from '../data/drills';
import { VideoPlayer } from './VideoPlayer';

interface Props {
  drill: Drill;
  /** Ticked off. Leave out for a row without a checkbox. */
  done?: boolean;
  onToggle?: () => void;
  /** Starts the guided player at this drill. */
  onPlay?: () => void;
}

/** A warm-up, cooldown or mobility drill: its demo (tap the thumbnail to watch), what to do, and how much. */
export function DrillRow({ drill, done, onToggle, onPlay }: Props) {
  const [watching, setWatching] = useState(false);
  const video = drillVideo(drill);
  const dose = (
    <>
      {drill.timer && <Timer size={13} aria-label="Timed" />}
      {drill.dose}
    </>
  );
  return (
    <li className={`drill${done ? ' is-done' : ''}`}>
      <div className="drill__row">
        {onToggle && (
          <button className="drill__check" aria-pressed={!!done} aria-label={`${drill.name} done`} onClick={onToggle}>
            {done ? <CircleCheck size={22} aria-hidden /> : <Circle size={22} aria-hidden />}
          </button>
        )}
        {video && (
          <button
            className="drill__thumb"
            aria-expanded={watching}
            aria-label={`${watching ? 'Hide' : 'Watch'} how to do ${drill.name}`}
            onClick={() => setWatching(!watching)}
          >
            <img src={`https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" />
            <Play size={14} fill="currentColor" aria-hidden />
          </button>
        )}
        <span className="drill__main">
          <span className="drill__name">{drill.name}</span>
          <span className="drill__dose drill__dose--inline" aria-hidden>
            {dose}
          </span>
          <span className="drill__cue">{drill.cue}</span>
        </span>
        <span className="drill__dose">{dose}</span>
        {onPlay && (
          <button className="icon-btn drill__play" aria-label={`Follow along from ${drill.name}`} title="Follow along from here" onClick={onPlay}>
            <Play size={16} aria-hidden />
          </button>
        )}
      </div>
      {watching && video && <VideoPlayer video={video} exerciseName={drill.name} autoPlay />}
    </li>
  );
}
