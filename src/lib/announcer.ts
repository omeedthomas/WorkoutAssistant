import { useSyncExternalStore } from 'react';

/**
 * The guided-workout announcer: reads out each exercise, rest and countdown with the browser's built-in
 * speech. Preferences are per device (like notification permission), so they live in localStorage.
 */
export interface GuidePrefs {
  /** Spoken announcements and countdowns. */
  voice: boolean;
  /** Looping demo videos in the guided workout. */
  video: boolean;
}

const KEY = 'ascent:guide';
const DEFAULTS: GuidePrefs = { voice: true, video: true };

let prefs: GuidePrefs | null = null;
const listeners = new Set<() => void>();

export function guidePrefs(): GuidePrefs {
  if (!prefs) {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<GuidePrefs>;
      prefs = {
        voice: typeof stored.voice === 'boolean' ? stored.voice : DEFAULTS.voice,
        video: typeof stored.video === 'boolean' ? stored.video : DEFAULTS.video,
      };
    } catch {
      prefs = { ...DEFAULTS };
    }
  }
  return prefs;
}

export function setGuidePrefs(patch: Partial<GuidePrefs>) {
  prefs = { ...guidePrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // not persisted; it still applies until the page reloads
  }
  if (patch.voice === false) stopSpeaking();
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useGuidePrefs(): GuidePrefs {
  return useSyncExternalStore(subscribe, guidePrefs, guidePrefs);
}

export const speechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

// ---------- Speaking ----------

let voice: SpeechSynthesisVoice | null | undefined;

/**
 * An English voice that runs on the device, matching your region when possible ("en-GB" for en-GB). Network
 * voices send the text to a speech service, so they're only used when there's no on-device voice at all.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (!all.length) return null;
  const region = (navigator.language || 'en-US').toLowerCase();
  const local = all.filter((v) => v.localService);
  return (
    local.find((v) => v.lang.toLowerCase() === region && v.default) ??
    local.find((v) => v.lang.toLowerCase() === region) ??
    local.find((v) => v.lang.toLowerCase() === 'en-us') ??
    local[0] ??
    null
  );
}

if (speechSupported()) {
  // Voices load asynchronously in some browsers; pick again once they arrive.
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    voice = undefined;
  });
}

interface SpeakOptions {
  /** Cut off whatever is being said (default). Off: queue after it. */
  interrupt?: boolean;
  /** Only speak if nothing else is being said, e.g. countdown numbers that would be late. */
  ifIdle?: boolean;
}

export function speak(text: string, { interrupt = true, ifIdle = false }: SpeakOptions = {}) {
  if (!guidePrefs().voice || !speechSupported()) return;
  const synth = window.speechSynthesis;
  if (ifIdle && (synth.speaking || synth.pending)) return;
  if (interrupt) synth.cancel();
  if (voice === undefined) voice = pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-US';
  u.rate = 1.05;
  synth.speak(u);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/**
 * Call from a tap. Some browsers (Safari on iOS) only allow speech once a page has spoken in response to a
 * user gesture, so this speaks a silent utterance to unlock it for the announcements that follow.
 */
export function unlockSpeech() {
  if (!guidePrefs().voice || !speechSupported() || window.speechSynthesis.speaking) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}
