import { useRef, useState } from 'react';
import { Bell, BellOff, Download, RotateCcw, Target, Upload, Volume2, VolumeX, Wrench } from 'lucide-react';
import { AccountSection } from '../components/Account';
import { remindersEnabled, remindersSupported, setRemindersEnabled, showNotification } from '../components/StreakReminder';
import { useToast } from '../components/Toast';
import { setGuidePrefs, speak, speechSupported, useGuidePrefs } from '../lib/announcer';
import { REMINDER_HOURS } from '../lib/history';
import { exercises, tracks, trees } from '../data';
import { equipmentById } from '../data/equipment';
import { useCloud } from '../state/CloudContext';
import { useProgress } from '../state/ProgressContext';

export function SettingsPage() {
  const { state, reset, importState, setUnits } = useProgress();
  const cloud = useCloud();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascent-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const ok = importState(JSON.parse(await file.text()));
      toast(ok ? 'Progress imported' : "That file doesn't look like an Ascent backup");
    } catch {
      toast("Couldn't read that file", 'Make sure it is a .json backup exported from Ascent.');
    }
  };

  const where = cloud.user ? 'on this device and in your account' : 'on this device';

  const confirmReset = () => {
    if (window.confirm(`Reset all progress? This deletes every mastered skill, logged session, goal and weigh-in ${where}.`)) {
      reset();
      toast('Progress reset');
    }
  };

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <h1>Settings</h1>
      </header>

      <AccountSection />

      <section className="card settings-section">
        <h2>Units</h2>
        <p className="muted small">For your body weight and the added weight on weighted exercises.</p>
        <div className="segmented" role="group" aria-label="Weight units">
          <button aria-pressed={state.units === 'lb'} onClick={() => setUnits('lb')}>
            Pounds (lb)
          </button>
          <button aria-pressed={state.units === 'kg'} onClick={() => setUnits('kg')}>
            Kilograms (kg)
          </button>
        </div>
      </section>

      <section className="card settings-section">
        <h2>Equipment</h2>
        <p className="muted small">
          {state.equipment
            ? state.equipment.have.length
              ? `You have: ${state.equipment.have.map((e) => equipmentById[e].name).join(', ')}. Workouts only include what you can do.`
              : "You've said you have no equipment, so workouts stick to the floor, a wall and household stand-ins."
            : 'Not set yet, so nothing is filtered out. Tell Ascent what you have and workouts will only include what you can do.'}
        </p>
        <a href="#/equipment" className="btn">
          <Wrench size={16} aria-hidden /> {state.equipment ? 'Change equipment' : 'Set up equipment'}
        </a>
      </section>

      <GuidedWorkoutSettings />

      <StreakReminderSettings />

      <section className="card settings-section">
        <h2>Starting point</h2>
        <p className="muted small">Re-assess what you can already do across every progression.</p>
        <a href="#/start" className="btn">
          <Target size={16} aria-hidden /> Update starting point
        </a>
      </section>

      <section className="card settings-section">
        <h2>Your data</h2>
        <p className="muted small">
          {cloud.user
            ? 'Your progress is saved to your account and kept in this browser for offline use. You can also export a file backup.'
            : "Progress is saved in this browser. Sign in to keep it in your account, or export a backup file to move it."}
        </p>
        <div className="button-row">
          <button className="btn" onClick={exportData}>
            <Download size={16} aria-hidden /> Export backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden /> Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="card settings-section settings-section--danger">
        <h2>Reset</h2>
        <p className="muted small">Clear every mastered skill, logged session, goal and weigh-in {where}.</p>
        <button className="btn btn--danger" onClick={confirmReset}>
          <RotateCcw size={16} aria-hidden /> Reset all progress
        </button>
      </section>

      <p className="muted small about">
        {trees.length} skill trees · {tracks.length} progressions · {exercises.length} exercises. Train within your
        limits, warm up first, and stop if something hurts.
      </p>
      <p className="muted small about">
        <a href="#/privacy">Privacy Policy</a> · <a href="#/terms">Terms of Service</a>
      </p>
    </div>
  );
}

/** The announcer and demo videos in guided workouts (per device). */
function GuidedWorkoutSettings() {
  const prefs = useGuidePrefs();
  const canSpeak = speechSupported();
  return (
    <section className="card settings-section">
      <h2>Guided workouts</h2>
      <p className="muted small">
        When you follow along, an announcer tells you what's next ("Time to do Push-up for 12 reps"), counts you in
        with 3, 2, 1 before every timer, and counts down the end of each set and rest. You can also mute it with the
        speaker button during a workout.
      </p>
      {canSpeak ? (
        <div className="button-row">
          <div className="segmented" role="group" aria-label="Announcer">
            <button aria-pressed={prefs.voice} onClick={() => setGuidePrefs({ voice: true })}>
              <Volume2 size={16} aria-hidden /> Announcer on
            </button>
            <button aria-pressed={!prefs.voice} onClick={() => setGuidePrefs({ voice: false })}>
              <VolumeX size={16} aria-hidden /> Off
            </button>
          </div>
          <button className="btn" disabled={!prefs.voice} onClick={() => speak('Time to do Push-up for 12 reps. 3, 2, 1, go!')}>
            Test the announcer
          </button>
        </div>
      ) : (
        <p className="callout callout--muted small">This browser can't read announcements out loud. Timers and countdowns still show on screen.</p>
      )}
      <label className="checkbox">
        <input type="checkbox" checked={prefs.video} onChange={(e) => setGuidePrefs({ video: e.target.checked })} />
        <span>Play a looping, muted demo video of each exercise. Turn this off to save data; you'll see a still picture instead.</span>
      </label>
    </section>
  );
}

const hourLabel = (h: number) => new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(2026, 0, 1, h));

/** Turn system notifications for an at-risk streak on or off (per device, since permission is per browser). */
function StreakReminderSettings() {
  const toast = useToast();
  const supported = remindersSupported();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported');
  const [enabled, setEnabled] = useState(() => remindersEnabled() && permission === 'granted');
  const times = REMINDER_HOURS.map(hourLabel).join(' and ');

  const turnOn = async () => {
    const result = permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') {
      toast('Notifications are blocked', "Allow notifications for this site in your browser's settings, then try again.");
      return;
    }
    setRemindersEnabled(true);
    setEnabled(true);
    showNotification('Streak reminders are on', `If your streak is about to end, you'll get a reminder at ${times}.`);
  };

  const turnOff = () => {
    setRemindersEnabled(false);
    setEnabled(false);
    toast('Streak reminders are off');
  };

  return (
    <section className="card settings-section">
      <h2>Streak reminders</h2>
      <p className="muted small">
        On the last day you can train to keep your streak, Ascent reminds you when you open the app. Turn on
        notifications to also get a reminder at {times} if you still haven't worked out. They come from your browser
        while Ascent is open in a tab (it can be in the background).
      </p>
      {permission === 'unsupported' ? (
        <p className="callout callout--muted small">This browser doesn't support notifications. You'll still see reminders in the app.</p>
      ) : permission === 'denied' ? (
        <p className="callout callout--muted small">
          Notifications are blocked for this site. Allow them in your browser's site settings to turn reminders on.
        </p>
      ) : enabled ? (
        <div className="button-row">
          <span className="reminder-status">
            <Bell size={16} aria-hidden /> Notifications on
          </span>
          <button className="btn" onClick={turnOff}>
            <BellOff size={16} aria-hidden /> Turn off
          </button>
        </div>
      ) : (
        <button className="btn btn--primary" onClick={() => void turnOn()}>
          <Bell size={16} aria-hidden /> Turn on notifications
        </button>
      )}
    </section>
  );
}
