import { useState } from 'react';
import { ExternalLink, Play, Search } from 'lucide-react';
import type { ExerciseVideo } from '@ascent/core/data/videos';

interface Props {
  video: ExerciseVideo;
  exerciseName: string;
  /** Start playing right away, when it's shown because the viewer just asked to watch it. */
  autoPlay?: boolean;
}

/**
 * Shows the video's thumbnail and only loads YouTube's player once tapped.
 * Keeps the detail panel fast, and nothing is requested from YouTube except
 * the thumbnail until the viewer chooses to play.
 */
export function VideoPlayer({ video, exerciseName, autoPlay = false }: Props) {
  const [playing, setPlaying] = useState(autoPlay);
  const watchUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} tutorial`)}`;

  return (
    <figure className="video">
      <div className="video__frame">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&playsinline=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button className="video__poster" onClick={() => setPlaying(true)} aria-label={`Play video: ${video.title}`}>
            <img src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="video__play" aria-hidden>
              <Play size={24} fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="video__caption">
        <span className="video__title">{video.title}</span>
        <span className="video__meta">
          <span>{video.channel}</span>
          <a href={watchUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={12} aria-hidden /> YouTube
          </a>
          <a href={searchUrl} target="_blank" rel="noreferrer">
            <Search size={12} aria-hidden /> More videos
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
