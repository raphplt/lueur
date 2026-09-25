import { create } from 'zustand';

import { readSettings, writeSettings } from '@/db/repository';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from '@/domain/settings';

import { getDb } from './db-ref';

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => void;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: () => set({ settings: parseSettings(readSettings(getDb())), loaded: true }),
  update: (patch) => {
    const settings = { ...get().settings, ...patch };
    writeSettings(getDb(), patch as Record<string, unknown>);
    set({ settings });
  },
  reset: () => set({ settings: DEFAULT_SETTINGS }),
}));

export const selectSettings = (s: SettingsState) => s.settings;
