import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { LogoMark } from '@/brand/logo';
import {
  BOTHER_KEYS,
  GOAL_KEYS,
  type BotherKey,
  type GoalKey,
  type Settings,
} from '@/domain/settings';
import { DEFAULT_TAG_KEYS, type DefaultTagKey } from '@/domain/types';
import { requestPermission } from '@/notifications';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { Button } from '@/ui/button';
import { Chip, ChipGroup, Choice, Toggle } from '@/ui/controls';
import { useMotion } from '@/ui/motion';
import { Screen } from '@/ui/screen';
import { Txt } from '@/ui/text';
import { useTheme } from '@/ui/theme';
import { TimeDial } from '@/ui/time-dial';
import { motion, space } from '@/ui/tokens';

const STEPS = ['welcome', 'hours', 'bother', 'goal', 'reminder', 'tags'] as const;

/** Tags suggested from what bothers the user (all stay available). */
const TAGS_FOR_BOTHER: Record<BotherKey, DefaultTagKey[]> = {
  noise: ['noise', 'insect'],
  thoughts: ['thoughts', 'stress', 'clockWatching'],
  schedule: ['lateScreen', 'lateMeal'],
  screens: ['lateScreen'],
  pain: ['pain'],
  other: [],
};

export default function Onboarding() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { fade } = useMotion();
  const current = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const setDefaultTagsEnabled = useData((s) => s.setDefaultTagsEnabled);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Settings>(current);
  const [tagKeys, setTagKeys] = useState<DefaultTagKey[]>([...DEFAULT_TAG_KEYS]);
  const patch = (p: Partial<Settings>) => setDraft((d) => ({ ...d, ...p }));

  const finish = async (skipped: boolean) => {
    const final: Settings = skipped
      ? { ...current, onboarded: true }
      : { ...draft, onboarded: true };
    if (!skipped) setDefaultTagsEnabled(tagKeys);
    update(final);
    if (final.morningReminder.enabled || final.eveningReminder.enabled) {
      await requestPermission().catch(() => 'denied');
    }
    router.replace('/');
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : void finish(false));
  const name = STEPS[step]!;

  const toggleBother = (b: BotherKey) => {
    const on = draft.bother.includes(b);
    const bother = on ? draft.bother.filter((x) => x !== b) : [...draft.bother, b];
    patch({ bother });
    if (!on) setTagKeys((k) => [...new Set([...k, ...TAGS_FOR_BOTHER[b]])]);
  };

  return (
    <Screen
      testID="onboarding"
      footer={
        <View style={styles.footer}>
          <Button
            testID="onboarding-next"
            variant="primary"
            label={
              step === 0
                ? t('onboarding.welcome.start')
                : step === STEPS.length - 1
                  ? t('onboarding.finish')
                  : t('common.next')
            }
            onPress={next}
          />
          <Button
            testID="onboarding-skip"
            variant="quiet"
            label={step === 0 ? t('onboarding.welcome.skipAll') : t('common.skip')}
            onPress={() => (step === 0 ? void finish(true) : next())}
            style={styles.center}
          />
        </View>
      }
    >
      {step > 0 && (
        <View
          style={styles.progress}
          accessible
          accessibilityLabel={t('onboarding.progress', { step, total: STEPS.length - 1 })}
        >
          {STEPS.slice(1).map((s, i) => (
            <View
              key={s}
              style={[styles.progressDot, { backgroundColor: i < step ? c.light : c.line }]}
            />
          ))}
        </View>
      )}

      <Animated.View
        key={name}
        entering={FadeIn.duration(fade(motion.calm))}

        style={styles.body}
      >
        {name === 'welcome' && (
          <View style={styles.welcome}>
            <View style={styles.logo}>
              <LogoMark size={120} animated />
            </View>
            <Txt v="display" accessibilityRole="header">
              {t('onboarding.welcome.title')}
            </Txt>
            <Txt v="heading">{t('onboarding.welcome.lead')}</Txt>
            <Txt v="body" tone="textMuted">
              {t('onboarding.welcome.body')}
            </Txt>
            <Txt v="body" tone="calmText">
              {t('onboarding.welcome.privacy')}
            </Txt>
            <Txt v="caption" tone="textFaint">
              {t('common.notMedical')}
            </Txt>
          </View>
        )}

        {name === 'hours' && (
          <>
            <Title title={t('onboarding.hours.title')} body={t('onboarding.hours.body')} />
            <Txt v="label" tone="textMuted">
              {t('onboarding.hours.bedtime')}
            </Txt>
            <TimeDial
              testID="dial-bedtime"
              label={t('onboarding.hours.bedtime')}
              value={draft.habits.bedtimeClock}
              step={15}
              onChange={(v) =>
                patch({
                  habits: { ...draft.habits, bedtimeClock: v },
                  eveningReminder: { ...draft.eveningReminder, clock: (v - 60 + 1440) % 1440 },
                })
              }
            />
            <Txt v="label" tone="textMuted" style={styles.gapTop}>
              {t('onboarding.hours.rise')}
            </Txt>
            <TimeDial
              testID="dial-rise"
              label={t('onboarding.hours.rise')}
              value={draft.habits.riseClock}
              step={15}
              onChange={(v) =>
                patch({
                  habits: { ...draft.habits, riseClock: v },
                  morningReminder: { ...draft.morningReminder, clock: (v + 30) % 1440 },
                })
              }
            />
          </>
        )}

        {name === 'bother' && (
          <>
            <Title title={t('onboarding.bother.title')} body={t('onboarding.bother.body')} />
            <View style={styles.choices}>
              {BOTHER_KEYS.map((b) => (
                <Choice
                  key={b}
                  multi
                  testID={`bother-${b}`}
                  label={t(`onboarding.bother.${b}`)}
                  selected={draft.bother.includes(b)}
                  onPress={() => toggleBother(b)}
                />
              ))}
            </View>
          </>
        )}

        {name === 'goal' && (
          <>
            <Title title={t('onboarding.goal.title')} body={t('onboarding.goal.body')} />
            <View style={styles.choices}>
              {GOAL_KEYS.map((g: GoalKey) => (
                <Choice
                  key={g}
                  testID={`goal-${g}`}
                  label={t(`onboarding.goal.${g}`)}
                  selected={draft.goal === g}
                  onPress={() => patch({ goal: draft.goal === g ? null : g })}
                />
              ))}
            </View>
          </>
        )}

        {name === 'reminder' && (
          <>
            <Title title={t('onboarding.reminder.title')} body={t('onboarding.reminder.body')} />
            <View style={styles.toggleRow}>
              <Txt v="bodyStrong" style={styles.flex}>
                {t('onboarding.reminder.morning')}
              </Txt>
              <Toggle
                testID="toggle-morning"
                label={t('onboarding.reminder.morning')}
                value={draft.morningReminder.enabled}
                onChange={(enabled) =>
                  patch({ morningReminder: { ...draft.morningReminder, enabled } })
                }
              />
            </View>
            {draft.morningReminder.enabled && (
              <TimeDial
                label={t('onboarding.reminder.morning')}
                value={draft.morningReminder.clock}
                onChange={(clock) =>
                  patch({ morningReminder: { ...draft.morningReminder, clock } })
                }
              />
            )}
            <View style={[styles.toggleRow, styles.gapTop]}>
              <View style={styles.flex}>
                <Txt v="bodyStrong">{t('onboarding.reminder.evening')}</Txt>
                <Txt v="caption" tone="textMuted">
                  {t('onboarding.reminder.eveningHint')}
                </Txt>
              </View>
              <Toggle
                testID="toggle-evening"
                label={t('onboarding.reminder.evening')}
                value={draft.eveningReminder.enabled}
                onChange={(enabled) =>
                  patch({ eveningReminder: { ...draft.eveningReminder, enabled } })
                }
              />
            </View>
            {draft.eveningReminder.enabled && (
              <TimeDial
                label={t('onboarding.reminder.evening')}
                value={draft.eveningReminder.clock}
                onChange={(clock) =>
                  patch({ eveningReminder: { ...draft.eveningReminder, clock } })
                }
              />
            )}
          </>
        )}

        {name === 'tags' && (
          <>
            <Title title={t('onboarding.tags.title')} body={t('onboarding.tags.body')} />
            <ChipGroup>
              {DEFAULT_TAG_KEYS.map((k) => {
                const on = tagKeys.includes(k);
                return (
                  <Chip
                    key={k}
                    testID={`onboarding-tag-${k}`}
                    label={t(`tags.${k}`)}
                    selected={on}
                    onPress={() =>
                      setTagKeys(on ? tagKeys.filter((x) => x !== k) : [...tagKeys, k])
                    }
                  />
                );
              })}
            </ChipGroup>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

function Title({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.title}>
      <Txt v="title" accessibilityRole="header">
        {title}
      </Txt>
      <Txt v="body" tone="textMuted">
        {body}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  welcome: { gap: space.md, marginTop: space.huge },
  logo: { marginLeft: -16, marginBottom: -space.md },
  title: { gap: space.xs, marginBottom: space.lg },
  progress: { flexDirection: 'row', gap: space.xs, marginBottom: space.xxl },
  progressDot: { flex: 1, height: 3, borderRadius: 2 },
  choices: { gap: space.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  gapTop: { marginTop: space.lg },
  footer: { gap: space.xxs },
  center: { alignSelf: 'center' },
});
