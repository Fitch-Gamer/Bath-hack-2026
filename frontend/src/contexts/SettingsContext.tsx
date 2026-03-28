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
  const [settings, setSettings] = useState<SettingsState>(() => {
    if (typeof window === 'undefined') {
      return defaultSettings;
    }
    try {
      const stored = localStorage.getItem('recordingSettings');
      if (!stored) return defaultSettings;
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('recordingSettings', JSON.stringify(settings));
  }, [settings]);

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
