import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/store/settings';
import { TabBar } from '@/ui/tab-bar';

export default function TabsLayout() {
  const { t } = useTranslation();
  const onboarded = useSettings((s) => s.settings.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="nights" options={{ title: t('tabs.nights') }} />
      <Tabs.Screen name="patterns" options={{ title: t('tabs.patterns') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
