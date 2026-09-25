import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { listUnassignedWakeEvents } from '@/db/repository';
import {
  defaultDraft,
  draftClock,
  draftWasoMin,
  nightToDraft,
  validateDraft,
  type NightDraft,
} from '@/domain/draft';
import { formatClock, formatDuration, formatPercent, nightLabel } from '@/domain/format';
import { addDays, deviceZone, diffDays, isDateKey } from '@/domain/time';
import { bandInputFromDraft, entryAxis } from '@/features/band/geometry';
import { BandEditor, DEFAULT_AWAKENING_MIN } from '@/features/entry/band-editor';
import { addAwakeningInLongestGap } from '@/features/entry/handles';
import { QualityPicker } from '@/features/entry/quality-picker';
import { tagLabel } from '@/features/insights/describe';
import { useToday } from '@/hooks/use-today';
import { useData } from '@/store/data';
import { getDb } from '@/store/db-ref';
import { useSettings } from '@/store/settings';
import { Button } from '@/ui/button';
import { Chip, ChipGroup, SectionTitle } from '@/ui/controls';
import { Dialog } from '@/ui/dialog';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icons';
import { Screen } from '@/ui/screen';
import { Txt } from '@/ui/text';
import { useToast } from '@/ui/toast';
import { usePrefs, useTheme } from '@/ui/theme';
import { layout, radius, space, type } from '@/ui/tokens';

/** How far back a forgotten night can be logged. */
export const MAX_BACKFILL_DAYS = 14;
const DURATIONS = [5, 15, 30, 45, 60, 90];

function buildDraft(date: string): { draft: NightDraft; imported: number } {
  const { nights } = useData.getState();
  const existing = nights.find((n) => n.wakeDate === date);
  if (existing) return { draft: nightToDraft(existing), imported: 0 };
  const previous = [...nights].reverse().find((n) => n.wakeDate < date) ?? null;
  const habits = useSettings.getState().settings.habits;
  // Night-mode awakenings recorded between the previous evening and this morning.
  const from = deviceZone.toInstant(date, -12 * 60);
  const to = deviceZone.toInstant(date, 14 * 60);
  const wakeEvents = listUnassignedWakeEvents(getDb(), from, to);
  const draft = defaultDraft({ wakeDate: date, habits, previous, wakeEvents, zone: deviceZone });
  return { draft, imported: draft.awakenings.length };
}

export default function Entry() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { locale, hour12 } = usePrefs();
  const today = useToday();
  const params = useLocalSearchParams<{ date?: string }>();
  const initialDate = params.date && isDateKey(params.date) ? params.date : today;

  const nights = useData((s) => s.nights);
  const tags = useData((s) => s.tags);
  const saveDraft = useData((s) => s.saveDraft);
  const deleteNight = useData((s) => s.deleteNight);
  const toast = useToast((s) => s.show);

  const [state, setState] = useState(() => {
    const built = buildDraft(initialDate);
    return { ...built, axis: entryAxis(bandInputFromDraft(built.draft)) };
  });
  const { draft, axis, imported } = state;
  const setDraft = (d: NightDraft) => setState((s) => ({ ...s, draft: d }));
  const [selected, setSelected] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(draft.note.length > 0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const existing = nights.find((n) => n.wakeDate === draft.wakeDate) ?? null;
  const daysAgo = diffDays(draft.wakeDate, today);
  const canGoBack = daysAgo < MAX_BACKFILL_DAYS || nights.some((n) => n.wakeDate < draft.wakeDate);
  const canGoForward = daysAgo > 0;

  const goTo = (date: string) => {
    const built = buildDraft(date);
    setState({ ...built, axis: entryAxis(bandInputFromDraft(built.draft)) });
    setSelected(null);
    setNoteOpen(built.draft.note.length > 0);
  };

  const issues = validateDraft(draft);
  const metrics = useMemo(() => {
    const onset = draft.bedMin + draft.latencyMin;
    const sleep = Math.max(0, draft.finalWakeMin - onset - draftWasoMin(draft));
    const inBed = Math.max(1, draft.outOfBedMin - draft.bedMin);
    return { sleep, efficiency: sleep / inBed };
  }, [draft]);

  const visibleTags = tags.filter((tag) => tag.enabled || draft.tagIds.includes(tag.id));
  const selectedAwakening = selected !== null ? draft.awakenings[selected] : undefined;

  const save = () => {
    if (issues.length > 0) return;
    saveDraft(draft);
    toast(t('entry.saved'));
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen
      testID="entry"
      footer={
        <View style={styles.footer}>
          {issues.length > 0 && (
            <Txt v="caption" tone="textMuted" align="center" testID="entry-issue">
              {t(`entry.issues.${issues[0]!}`)}
            </Txt>
          )}
          <Button
            testID="entry-save"
            variant="primary"
            label={t('common.save')}
            onPress={save}
            disabled={issues.length > 0}
          />
        </View>
      }
    >
      <Header
        close
        title={t('entry.title')}
        right={
          <View style={styles.dateNav}>
            <Pressable
              testID="entry-prev"
              accessibilityRole="button"
              accessibilityLabel={t('entry.previousNight')}
              disabled={!canGoBack}
              onPress={() => goTo(addDays(draft.wakeDate, -1))}
              style={[styles.navBtn, !canGoBack && styles.dim]}
            >
              <Icon name="chevronLeft" color={c.textMuted} />
            </Pressable>
            <Pressable
              testID="entry-next"
              accessibilityRole="button"
              accessibilityLabel={t('entry.nextNight')}
              disabled={!canGoForward}
              onPress={() => goTo(addDays(draft.wakeDate, 1))}
              style={[styles.navBtn, !canGoForward && styles.dim]}
            >
              <Icon name="chevronRight" color={c.textMuted} />
            </Pressable>
          </View>
        }
        subtitle={nightLabel(draft.wakeDate, locale)}
      />

      <BandEditor
        draft={draft}
        axis={axis}
        onChange={setDraft}
        selected={selected}
        onSelect={setSelected}
      />

      <Txt v="caption" tone="textMuted" style={styles.hint}>
        {t('entry.hint')}
      </Txt>
      {imported > 0 && (
        <Txt v="caption" tone="calmText" style={styles.hint}>
          {t('entry.nightModeImported', { count: imported })}
        </Txt>
      )}

      <View style={styles.summary} accessible>
        <Txt v="heading" testID="entry-summary">
          {t('entry.summary', {
            sleep: formatDuration(metrics.sleep, locale),
            efficiency: formatPercent(metrics.efficiency, locale),
          })}
        </Txt>
        <Txt v="body" tone="textMuted">
          {t('entry.latency', { duration: formatDuration(draft.latencyMin, locale) })}
          {' · '}
          {draft.awakenings.length === 0
            ? t('entry.awakeningsNone')
            : t('entry.awakeningsSummary', {
                count: draft.awakenings.length,
                duration: formatDuration(draftWasoMin(draft), locale),
              })}
        </Txt>
      </View>

      {selectedAwakening ? (
        <View
          style={[styles.awakening, { backgroundColor: c.bgRaised, borderColor: c.line }]}
          testID="awakening-editor"
        >
          <Txt v="bodyStrong">
            {t('entry.awakeningAt', {
              time: formatClock(draftClock(selectedAwakening.startMin), hour12),
            })}
          </Txt>
          <Txt v="label" tone="textMuted">
            {t('entry.awakeningDuration')}
          </Txt>
          <ChipGroup>
            {DURATIONS.map((m) => (
              <Chip
                key={m}
                testID={`awakening-${m}`}
                label={formatDuration(m, locale)}
                selected={selectedAwakening.durationMin === m}
                onPress={() => {
                  const onsetMin = draft.bedMin + draft.latencyMin;
                  const room = draft.finalWakeMin - Math.max(onsetMin, selectedAwakening.startMin);
                  const next = draft.awakenings.map((a, i) =>
                    i === selected ? { ...a, durationMin: Math.min(m, room) } : a,
                  );
                  setDraft({ ...draft, awakenings: next });
                }}
              />
            ))}
          </ChipGroup>
          <Button
            variant="quiet"
            label={t('entry.removeAwakening')}
            onPress={() => {
              setDraft({ ...draft, awakenings: draft.awakenings.filter((_, i) => i !== selected) });
              setSelected(null);
            }}
            style={styles.left}
          />
        </View>
      ) : (
        <Button
          testID="add-awakening"
          variant="quiet"
          label={`+ ${t('entry.addAwakening')}`}
          onPress={() => {
            const next = addAwakeningInLongestGap(draft, DEFAULT_AWAKENING_MIN);
            if (next === draft) return;
            setDraft(next);
            const known = new Set(draft.awakenings.map((a) => a.startMin));
            setSelected(next.awakenings.findIndex((a) => !known.has(a.startMin)));
          }}
          style={styles.left}
        />
      )}

      <SectionTitle>{t('quality.title')}</SectionTitle>
      <QualityPicker
        value={draft.quality}
        onChange={(quality) => setDraft({ ...draft, quality })}
      />

      <View style={styles.sectionRow}>
        <SectionTitle style={styles.flex}>{t('entry.tags')}</SectionTitle>
        <Button
          variant="quiet"
          label={t('entry.manageTags')}
          onPress={() => router.push('/tags')}
          style={styles.manage}
        />
      </View>
      <ChipGroup>
        {visibleTags.map((tag) => {
          const on = draft.tagIds.includes(tag.id);
          return (
            <Chip
              key={tag.id}
              testID={`tag-${tag.key ?? tag.id}`}
              label={tagLabel(tag, t)}
              selected={on}
              onPress={() =>
                setDraft({
                  ...draft,
                  tagIds: on ? draft.tagIds.filter((x) => x !== tag.id) : [...draft.tagIds, tag.id],
                })
              }
            />
          );
        })}
      </ChipGroup>

      <SectionTitle>{t('entry.note')}</SectionTitle>
      {noteOpen ? (
        <TextInput
          testID="entry-note"
          value={draft.note}
          onChangeText={(note) => setDraft({ ...draft, note })}
          placeholder={t('entry.notePlaceholder')}
          placeholderTextColor={c.textFaint}
          multiline
          maxLength={500}
          accessibilityLabel={t('entry.note')}
          style={[styles.note, { color: c.text, backgroundColor: c.bgRaised, borderColor: c.line }]}
        />
      ) : (
        <Button
          variant="quiet"
          label={`+ ${t('entry.note')}`}
          onPress={() => setNoteOpen(true)}
          style={styles.left}
        />
      )}

      {existing && (
        <Button
          testID="entry-delete"
          variant="quiet"
          label={t('entry.deleteNight')}
          onPress={() => setConfirmDelete(true)}
          style={styles.delete}
        />
      )}

      <Dialog
        visible={confirmDelete}
        message={t('entry.deleteConfirm', {
          label: nightLabel(draft.wakeDate, locale).replace(/^(nuit du |night of )/, ''),
        })}
        onDismiss={() => setConfirmDelete(false)}
        actions={[
          {
            label: t('common.delete'),
            variant: 'primary',
            testID: 'confirm-delete',
            onPress: () => {
              if (existing) deleteNight(existing.id);
              setConfirmDelete(false);
              router.back();
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmDelete(false) },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateNav: { flexDirection: 'row', gap: space.xxs },
  navBtn: {
    width: layout.touch,
    height: layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.3 },
  hint: { marginTop: space.xxs },
  summary: { marginTop: space.lg, gap: space.xxs },
  awakening: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: space.sm,
  },
  left: { alignSelf: 'flex-start', marginTop: space.xs, marginLeft: -space.xs },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end' },
  flex: { flex: 1 },
  manage: { marginBottom: space.xxs },
  note: {
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.md,
    ...type.body,
    textAlignVertical: 'top',
  },
  delete: { alignSelf: 'center', marginTop: space.xxl },
  footer: { gap: space.xs },
});
