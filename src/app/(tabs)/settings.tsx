import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatClock } from '@/domain/format';
import type { ReminderSetting, Settings } from '@/domain/settings';
import { getPermission, requestPermission, type PermissionState } from '@/notifications';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { Divider, Row, SectionTitle, Segmented, Toggle } from '@/ui/controls';
import { Dialog } from '@/ui/dialog';
import { Screen } from '@/ui/screen';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { usePrefs } from '@/ui/theme';
import { TimeDial } from '@/ui/time-dial';
import { space } from '@/ui/tokens';

type TimeField = 'bedtime' | 'rise' | 'morning' | 'evening';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { hour12 } = usePrefs();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const tags = useData((s) => s.tags);
  const [editing, setEditing] = useState<TimeField | null>(null);
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  useEffect(() => {
    const check = () => void getPermission().then(setPermission);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  const clock = (m: number) => formatClock(m, hour12);
  const setReminder = async (key: 'morningReminder' | 'eveningReminder', r: ReminderSetting) => {
    if (r.enabled && permission !== 'granted') {
      const p = await requestPermission();
      setPermission(p);
    }
    update({ [key]: r } as Partial<Settings>);
  };

  const timeValue = (f: TimeField) =>
    f === 'bedtime'
      ? settings.habits.bedtimeClock
      : f === 'rise'
        ? settings.habits.riseClock
        : f === 'morning'
          ? settings.morningReminder.clock
          : settings.eveningReminder.clock;
  const setTime = (f: TimeField, v: number) => {
    if (f === 'bedtime') update({ habits: { ...settings.habits, bedtimeClock: v } });
    else if (f === 'rise') update({ habits: { ...settings.habits, riseClock: v } });
    else if (f === 'morning')
      update({ morningReminder: { ...settings.morningReminder, clock: v } });
    else update({ eveningReminder: { ...settings.eveningReminder, clock: v } });
  };
  const timeLabels: Record<TimeField, string> = {
    bedtime: t('settings.bedtime'),
    rise: t('settings.rise'),
    morning: t('settings.morningReminder'),
    evening: t('settings.eveningReminder'),
  };

  return (
    <Screen testID="settings">
      <Txt v="title" accessibilityRole="header">
        {t('settings.title')}
      </Txt>

      <SectionTitle>{t('settings.display')}</SectionTitle>
      <Surface style={styles.stack}>
        <Txt v="caption" tone="textMuted">
          {t('settings.ambiance')}
        </Txt>
        <Segmented
          testID="theme"
          label={t('settings.ambiance')}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'auto', label: t('common.auto') },
            { value: 'dawn', label: t('settings.ambianceDawn') },
            { value: 'ink', label: t('settings.ambianceInk') },
          ]}
        />
        <Txt v="caption" tone="textFaint">
          {t('settings.ambianceHint')}
        </Txt>
        <Txt v="caption" tone="textMuted">
          {t('settings.clock')}
        </Txt>
        <Segmented
          testID="clock"
          label={t('settings.clock')}
          value={settings.clock}
          onChange={(clockPref) => update({ clock: clockPref })}
          options={[
            { value: 'system', label: t('common.auto') },
            { value: '24h', label: t('settings.clock24') },
            { value: '12h', label: t('settings.clock12') },
          ]}
        />
        <Txt v="caption" tone="textMuted">
          {t('settings.language')}
        </Txt>
        <Segmented
          testID="language"
          label={t('settings.language')}
          value={settings.language}
          onChange={(language) => update({ language })}
          options={[
            { value: 'system', label: t('common.auto') },
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Txt v="caption" tone="textMuted">
          {t('settings.weekStart')}
        </Txt>
        <Segmented
          testID="week-start"
          label={t('settings.weekStart')}
          value={settings.weekStartsOn}
          onChange={(weekStartsOn) => update({ weekStartsOn })}
          options={[
            { value: 'system', label: t('common.auto') },
            { value: 1, label: t('settings.monday') },
            { value: 0, label: t('settings.sunday') },
            { value: 6, label: t('settings.saturday') },
          ]}
        />
      </Surface>

      <SectionTitle>{t('settings.habits')}</SectionTitle>
      <Surface padded={false}>
        <Row
          label={t('settings.bedtime')}
          value={clock(settings.habits.bedtimeClock)}
          onPress={() => setEditing('bedtime')}
          testID="habit-bedtime"
        />
        <Divider />
        <Row
          label={t('settings.rise')}
          value={clock(settings.habits.riseClock)}
          onPress={() => setEditing('rise')}
          testID="habit-rise"
        />
      </Surface>
      <Txt v="caption" tone="textMuted" style={styles.hint}>
        {t('settings.habitsHint')}
      </Txt>

      <SectionTitle>{t('settings.tags')}</SectionTitle>
      <Surface padded={false}>
        <Row
          icon="tag"
          label={t('settings.tags')}
          hint={t('settings.tagsHint', {
            enabled: tags.filter((x) => x.enabled).length,
            total: tags.length,
          })}
          onPress={() => router.push('/tags')}
          testID="open-tags"
        />
        <Divider />
        <Row
          icon="window"
          label={t('settings.environment')}
          onPress={() => router.push('/environment')}
        />
      </Surface>

      <SectionTitle>{t('settings.reminders')}</SectionTitle>
      <Surface padded={false}>
        <Row
          icon="bell"
          label={t('settings.morningReminder')}
          chevron={false}
          right={
            <Toggle
              testID="toggle-morning"
              label={t('settings.morningReminder')}
              value={settings.morningReminder.enabled}
              onChange={(enabled) =>
                void setReminder('morningReminder', { ...settings.morningReminder, enabled })
              }
            />
          }
        />
        {settings.morningReminder.enabled && (
          <Row
            label={t('settings.time')}
            value={clock(settings.morningReminder.clock)}
            onPress={() => setEditing('morning')}
          />
        )}
        <Divider />
        <Row
          icon="bell"
          label={t('settings.eveningReminder')}
          chevron={false}
          right={
            <Toggle
              testID="toggle-evening"
              label={t('settings.eveningReminder')}
              value={settings.eveningReminder.enabled}
              onChange={(enabled) =>
                void setReminder('eveningReminder', { ...settings.eveningReminder, enabled })
              }
            />
          }
        />
        {settings.eveningReminder.enabled && (
          <Row
            label={t('settings.time')}
            value={clock(settings.eveningReminder.clock)}
            onPress={() => setEditing('evening')}
          />
        )}
      </Surface>
      {permission === 'denied' &&
      (settings.morningReminder.enabled || settings.eveningReminder.enabled) ? (
        <View style={styles.hint}>
          <Txt v="caption" tone="lightText">
            {t('settings.remindersDenied')}
          </Txt>
          <Row
            label={t('settings.openSystemSettings')}
            onPress={() => void Linking.openSettings()}
          />
        </View>
      ) : (
        <Txt v="caption" tone="textMuted" style={styles.hint}>
          {t('settings.remindersHint')}
        </Txt>
      )}

      <SectionTitle>{t('settings.data')}</SectionTitle>
      <Surface padded={false}>
        <Row
          icon="export"
          label={t('settings.data')}
          onPress={() => router.push('/data')}
          testID="open-data"
        />
        <Divider />
        <Row
          icon="info"
          label={t('settings.about')}
          onPress={() => router.push('/about')}
          testID="open-about"
        />
        <Divider />
        <Row
          label={t('settings.onboardingAgain')}
          onPress={() => {
            update({ onboarded: false });
            router.replace('/onboarding');
          }}
        />
      </Surface>
      <Txt v="caption" tone="textFaint" align="center" style={styles.version}>
        {t('about.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </Txt>

      <Dialog
        visible={editing !== null}
        title={editing ? timeLabels[editing] : undefined}
        onDismiss={() => setEditing(null)}
        actions={[{ label: t('common.done'), variant: 'primary', onPress: () => setEditing(null) }]}
      >
        {editing && (
          <TimeDial
            label={timeLabels[editing]}
            value={timeValue(editing)}
            step={editing === 'bedtime' || editing === 'rise' ? 15 : 5}
            onChange={(v) => setTime(editing, v)}
          />
        )}
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  hint: { marginTop: space.xs },
  version: { marginTop: space.xxl },
});
