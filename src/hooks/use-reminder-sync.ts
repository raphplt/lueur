import { useEffect } from 'react';
import { AppState } from 'react-native';

import { configureChannels, syncReminders } from '@/notifications';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';

/** Keeps scheduled reminders in line with settings, logged nights and the current time zone. */
export function useReminderSync(enabled: boolean) {
  const settings = useSettings((s) => s.settings);
  const nights = useData((s) => s.nights);
  const language = settings.language;

  useEffect(() => {
    if (!enabled) return;
    void configureChannels();
  }, [enabled, language]);

  useEffect(() => {
    if (!enabled || !settings.onboarded) return;
    const run = () =>
      void syncReminders(settings, new Set(nights.map((n) => n.wakeDate))).catch((e: unknown) =>
        console.warn('reminders', e),
      );
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [enabled, settings, nights]);
}
