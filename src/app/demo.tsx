import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { DEMO_ENABLED } from '@/demo/enabled';
import { demoData } from '@/demo/seed';
import { deviceZone } from '@/domain/time';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/ui/theme';

/**
 * lueur://demo            → loads the demo diary
 * lueur://demo?theme=ink  → same, with a forced ambiance (screenshots)
 * lueur://demo?empty=1    → wipes everything (fresh install state)
 * Only available in development and demo builds.
 */
export default function Demo() {
  const params = useLocalSearchParams<{ theme?: string; empty?: string; lang?: string }>();
  const { today } = useTheme();

  useEffect(() => {
    if (!DEMO_ENABLED) return;
    if (params.empty === '1') {
      useData.getState().wipe();
    } else {
      useData.getState().replaceAll(demoData(today, deviceZone));
    }
    useSettings.getState().load();
    const theme = params.theme === 'ink' || params.theme === 'dawn' ? params.theme : 'auto';
    const language = params.lang === 'fr' || params.lang === 'en' ? params.lang : 'system';
    if (params.empty !== '1') useSettings.getState().update({ theme, language });
    router.replace(params.empty === '1' ? '/onboarding' : '/');
  }, [params.empty, params.theme, params.lang, today]);

  if (!DEMO_ENABLED) return <Redirect href="/" />;
  return null;
}
