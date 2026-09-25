import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDuration, formatPercent, nightLabel } from '@/domain/format';
import { environmentComparison } from '@/domain/insights';
import { addDays } from '@/domain/time';
import type { EnvironmentChange } from '@/domain/types';
import { useToday } from '@/hooks/use-today';
import { useData } from '@/store/data';
import { Button } from '@/ui/button';
import { SectionTitle } from '@/ui/controls';
import { Dialog } from '@/ui/dialog';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icons';
import { Screen } from '@/ui/screen';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { usePrefs, useTheme } from '@/ui/theme';
import { layout, radius, space, type } from '@/ui/tokens';

interface Form {
  id?: string;
  label: string;
  date: string;
  note: string;
}

export default function Environment() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { locale } = usePrefs();
  const today = useToday();
  const nights = useData((s) => s.nights);
  const changes = useData((s) => s.environmentChanges);
  const save = useData((s) => s.saveEnvironmentChange);
  const remove = useData((s) => s.deleteEnvironmentChange);
  const [form, setForm] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState<EnvironmentChange | null>(null);

  const comparisons = useMemo(
    () => [...changes].reverse().map((ch) => environmentComparison(nights, ch)),
    [changes, nights],
  );
  const input = [styles.input, { color: c.text, backgroundColor: c.bgSunken, borderColor: c.line }];

  return (
    <Screen testID="environment">
      <Header title={t('environment.title')} subtitle={t('environment.intro')} />
      <Button
        testID="env-add"
        variant="primary"
        label={t('environment.add')}
        onPress={() => setForm({ label: '', date: today, note: '' })}
      />

      <SectionTitle>{t('environment.title')}</SectionTitle>
      {comparisons.length === 0 && (
        <Txt v="body" tone="textMuted">
          {t('environment.empty')}
        </Txt>
      )}
      <View style={styles.list}>
        {comparisons.map((cmp) => {
          const ch = cmp.change;
          const delta = cmp.sleepDeltaMin;
          return (
            <Surface key={ch.id} testID={`env-${ch.id}`}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${ch.label}, ${t('common.edit')}`}
                onPress={() =>
                  setForm({ id: ch.id, label: ch.label, date: ch.date, note: ch.note ?? '' })
                }
              >
                <Txt v="heading">{ch.label}</Txt>
                <Txt v="caption" tone="textMuted">
                  {t('environment.from')}{' '}
                  {nightLabel(ch.date, locale).replace(/^(nuit du |night of )/, '')}
                </Txt>
                {ch.note && (
                  <Txt v="caption" tone="textMuted">
                    {ch.note}
                  </Txt>
                )}
              </Pressable>
              <View style={styles.result}>
                {!cmp.ready ? (
                  <Txt v="body" tone="textMuted">
                    {t('environment.waiting', {
                      before: cmp.before.nights,
                      after: cmp.after.nights,
                    })}
                  </Txt>
                ) : (
                  <>
                    <Txt v="body">
                      {delta === null || Math.abs(delta) < 10
                        ? t('environment.sleepSame')
                        : t(delta > 0 ? 'environment.sleepMore' : 'environment.sleepLess', {
                            duration: formatDuration(delta, locale),
                          })}
                    </Txt>
                    <Txt v="caption" tone="textMuted">
                      {t('environment.difficult', {
                        before: formatPercent(cmp.before.difficult / cmp.before.nights, locale),
                        after: formatPercent(cmp.after.difficult / cmp.after.nights, locale),
                      })}
                    </Txt>
                    <Txt v="caption" tone="textFaint">
                      {t('environment.caveat')}
                    </Txt>
                  </>
                )}
              </View>
            </Surface>
          );
        })}
      </View>

      <Dialog
        visible={form !== null}
        title={t('environment.add')}
        onDismiss={() => setForm(null)}
        actions={[
          {
            label: t('common.save'),
            variant: 'primary',
            testID: 'env-save',
            onPress: () => {
              if (form && form.label.trim())
                save({ id: form.id, label: form.label, date: form.date, note: form.note });
              setForm(null);
            },
          },
          ...(form?.id
            ? [
                {
                  label: t('common.delete'),
                  variant: 'quiet' as const,
                  onPress: () => {
                    setDeleting(changes.find((x) => x.id === form.id) ?? null);
                    setForm(null);
                  },
                },
              ]
            : []),
        ]}
      >
        {form && (
          <View style={styles.form}>
            <Txt v="label" tone="textMuted">
              {t('environment.label')}
            </Txt>
            <TextInput
              testID="env-label"
              value={form.label}
              onChangeText={(label) => setForm({ ...form, label })}
              placeholder={t('environment.labelPlaceholder')}
              placeholderTextColor={c.textFaint}
              accessibilityLabel={t('environment.label')}
              maxLength={60}
              style={input}
            />
            <Txt v="label" tone="textMuted">
              {t('environment.from')}
            </Txt>
            <View style={styles.dateRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="−1"
                onPress={() => setForm({ ...form, date: addDays(form.date, -1) })}
                style={styles.nav}
              >
                <Icon name="chevronLeft" color={c.textMuted} />
              </Pressable>
              <Txt v="bodyStrong" align="center" style={styles.flex}>
                {nightLabel(form.date, locale).replace(/^(nuit du |night of )/, '')}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="+1"
                disabled={form.date >= today}
                onPress={() => setForm({ ...form, date: addDays(form.date, 1) })}
                style={[styles.nav, form.date >= today && styles.dim]}
              >
                <Icon name="chevronRight" color={c.textMuted} />
              </Pressable>
            </View>
            <Txt v="label" tone="textMuted">
              {t('environment.note')}
            </Txt>
            <TextInput
              value={form.note}
              onChangeText={(note) => setForm({ ...form, note })}
              accessibilityLabel={t('environment.note')}
              maxLength={200}
              style={input}
            />
          </View>
        )}
      </Dialog>

      <Dialog
        visible={deleting !== null}
        message={deleting ? t('environment.deleteConfirm', { label: deleting.label }) : undefined}
        onDismiss={() => setDeleting(null)}
        actions={[
          {
            label: t('common.delete'),
            variant: 'primary',
            onPress: () => {
              if (deleting) remove(deleting.id);
              setDeleting(null);
            },
          },
          { label: t('common.cancel'), onPress: () => setDeleting(null) },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  result: { marginTop: space.md, gap: space.xxs },
  form: { gap: space.xs },
  input: {
    ...type.body,
    minHeight: layout.touch,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.md,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  nav: {
    width: layout.touch,
    height: layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.3 },
  flex: { flex: 1 },
});
