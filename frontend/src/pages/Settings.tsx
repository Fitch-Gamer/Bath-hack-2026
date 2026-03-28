import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

const DURATION_OPTIONS = [15, 30, 60] as const;

type DurationOption = (typeof DURATION_OPTIONS)[number];

const Settings: React.FC = () => {
  const { settings, setSettings } = useSettings();

  const update = (newSettings: Partial<typeof settings>) => setSettings((current) => ({ ...current, ...newSettings }));

  return (
    <section className="mx-auto w-full max-w-3xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
      <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-3">Settings</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        Save your preferences for recording duration, prep time, camera mode, gaze tracking, and more.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--muted)] mb-2">Recording Time</label>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((value) => (
              <button
                key={value}
                onClick={() => update({ recordDuration: value as DurationOption })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  settings.recordDuration === value
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--surface)] text-[var(--on-surface)] border-[var(--border)] hover:bg-[var(--card)]'
                }`}
              >
                {value}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--muted)] mb-2">Prep Time</label>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((value) => (
              <button
                key={value}
                onClick={() => update({ prepDuration: value as DurationOption })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  settings.prepDuration === value
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--surface)] text-[var(--on-surface)] border-[var(--border)] hover:bg-[var(--card)]'
                }`}
              >
                {value}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--muted)] mb-3">Personal Bio</label>
          <textarea
            value={settings.userBio}
            onChange={(event) => update({ userBio: event.target.value })}
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--on-surface)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
            placeholder="Describe yourself for personalized prompts..."
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Your bio is saved immediately and used for future prompt personalisation.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <input
              type="checkbox"
              checked={settings.useCamera}
              onChange={(event) => update({ useCamera: event.target.checked })}
              className="mr-2 h-4 w-4"
            />
            Enable camera
          </label>

          <label className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <input
              type="checkbox"
              checked={settings.enableGaze}
              onChange={(event) => update({ enableGaze: event.target.checked })}
              disabled={!settings.useCamera}
              className="mr-2 h-4 w-4"
            />
            Gaze tracking
          </label>

          <label className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <input
              type="checkbox"
              checked={settings.enableDistractions}
              onChange={(event) => update({ enableDistractions: event.target.checked })}
              className="mr-2 h-4 w-4"
            />
            Audio distractions during recording
          </label>

          <label className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <input
              type="checkbox"
              checked={settings.includeMetrics}
              onChange={(event) => update({ includeMetrics: event.target.checked })}
              className="mr-2 h-4 w-4"
            />
            Include metrics in report
          </label>
        </div>

        <div className="rounded-lg bg-[var(--surface)] p-4 text-sm text-[var(--muted)] border border-[var(--border)]">
          <h2 className="font-semibold text-[var(--on-surface)] mb-2">Preview</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Duration: {settings.recordDuration}s</li>
            <li>Prep time: {settings.prepDuration}s</li>
            <li>Camera: {settings.useCamera ? 'On' : 'Off'}</li>
            <li>Gaze: {settings.useCamera && settings.enableGaze ? 'On' : 'Off'}</li>
            <li>Distractions: {settings.enableDistractions ? 'On' : 'Off'}</li>
            <li>Report metrics: {settings.includeMetrics ? 'On' : 'Off'}</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Settings;
