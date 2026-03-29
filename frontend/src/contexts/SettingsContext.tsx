import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type RecordingDuration = 15 | 30 | 60;
type PrepDuration = 15 | 30 | 60;

export type SettingsState = {
  recordDuration: RecordingDuration;
  prepDuration: PrepDuration;
  userBio: string;
  useCamera: boolean;
  enableGaze: boolean;
  enableDistractions: boolean;
  includeMetrics: boolean;
};

const defaultSettings: SettingsState = {
  recordDuration: 60,
  prepDuration: 15,
  userBio: '',
  useCamera: true,
  enableGaze: true,
  enableDistractions: true,
  includeMetrics: true,
};

type SettingsContextValue = {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/getsettings', {
          method: 'POST',
          credentials: 'include',
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        setSettings({
          recordDuration: [15, 30, 60].includes(data.recording_time_seconds)
            ? data.recording_time_seconds
            : defaultSettings.recordDuration,
          prepDuration: [15, 30, 60].includes(data.prep_time_seconds)
            ? data.prep_time_seconds
            : defaultSettings.prepDuration,
          userBio: data.bio ?? '',
          useCamera: Boolean(data.camera_enabled),
          enableGaze: Boolean(data.gaze_enabled),
          enableDistractions: Boolean(data.disfluency_enabled),
          includeMetrics: Boolean(data.report_metrics_enabled),
        });
      } catch {

      }
    };

    fetchSettings();
  }, []);

  const value = useMemo(() => ({ settings, setSettings }), [settings, setSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
};
