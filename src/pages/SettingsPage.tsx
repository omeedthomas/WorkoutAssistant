import { useRef } from 'react';
import { Download, RotateCcw, Target, Upload } from 'lucide-react';
import { AccountSection } from '../components/Account';
import { useToast } from '../components/Toast';
import { exercises, tracks, trees } from '../data';
import { useCloud } from '../state/CloudContext';
import { useProgress } from '../state/ProgressContext';

export function SettingsPage() {
  const { state, reset, importState } = useProgress();
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
    if (window.confirm(`Reset all progress? This deletes every mastered skill, logged session and goal ${where}.`)) {
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
        <p className="muted small">Clear every mastered skill, logged session and goal {where}.</p>
        <button className="btn btn--danger" onClick={confirmReset}>
          <RotateCcw size={16} aria-hidden /> Reset all progress
        </button>
      </section>

      <p className="muted small about">
        {trees.length} skill trees · {tracks.length} progressions · {exercises.length} exercises. Train within your
        limits, warm up first, and stop if something hurts.
      </p>
    </div>
  );
}
