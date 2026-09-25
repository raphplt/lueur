import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ExportData } from '@/domain/export-format';
import { pickBackup, shareCsv, shareJsonBackup, sharePdf } from '@/export';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { Divider, Row, SectionTitle, Segmented } from '@/ui/controls';
import { Dialog } from '@/ui/dialog';
import { Header } from '@/ui/header';
import { Screen } from '@/ui/screen';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { usePrefs } from '@/ui/theme';
import { useToast } from '@/ui/toast';
import { space } from '@/ui/tokens';

export default function Data() {
  const { t } = useTranslation();
  const { locale, hour12 } = usePrefs();
  const nights = useData((s) => s.nights);
  const replaceAll = useData((s) => s.replaceAll);
  const wipe = useData((s) => s.wipe);
  const loadSettings = useSettings((s) => s.load);
  const toast = useToast((s) => s.show);
  const [weeks, setWeeks] = useState(4);
  const [pending, setPending] = useState<ExportData | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    if (nights.length === 0) {
      toast(t('data.nothingToExport'));
      return;
    }
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.warn('export', e);
      toast(t('data.exportError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="data">
      <Header title={t('data.title')} subtitle={t('data.intro')} />

      <SectionTitle>{t('data.export')}</SectionTitle>
      <Surface padded={false}>
        <Row
          testID="export-pdf"
          icon="document"
          label={t('data.exportPdf')}
          hint={t('data.exportPdfHint')}
          onPress={() => void run(() => sharePdf(weeks, locale, hour12))}
        />
        <View style={styles.inset}>
          <Segmented
            label={t('data.pdfPeriod')}
            value={weeks}
            onChange={setWeeks}
            options={[2, 3, 4].map((w) => ({ value: w, label: t('data.pdfWeeks', { count: w }) }))}
          />
        </View>
        <Divider />
        <Row
          testID="export-json"
          icon="export"
          label={t('data.exportJson')}
          hint={t('data.exportJsonHint')}
          onPress={() => void run(shareJsonBackup)}
        />
        <Divider />
        <Row
          testID="export-csv"
          icon="table"
          label={t('data.exportCsv')}
          hint={t('data.exportCsvHint')}
          onPress={() => void run(shareCsv)}
        />
      </Surface>

      <SectionTitle>{t('data.import')}</SectionTitle>
      <Surface padded={false}>
        <Row
          testID="import"
          icon="import"
          label={t('data.import')}
          hint={t('data.importHint')}
          onPress={async () => {
            const res = await pickBackup();
            if (res.status === 'invalid') toast(t('data.importError'));
            if (res.status === 'ok') setPending(res.data);
          }}
        />
      </Surface>

      <SectionTitle>{t('data.wipe')}</SectionTitle>
      <Surface padded={false}>
        <Row
          testID="wipe"
          icon="trash"
          destructive
          label={t('data.wipe')}
          hint={t('data.wipeHint')}
          onPress={() => setConfirmWipe(true)}
        />
      </Surface>

      {busy && (
        <Txt v="caption" tone="textMuted" align="center" style={styles.busy}>
          …
        </Txt>
      )}

      <Dialog
        visible={pending !== null}
        message={
          pending
            ? t('data.importConfirm', {
                nights: t('common.nights', { count: pending.nights.length }),
              })
            : undefined
        }
        onDismiss={() => setPending(null)}
        actions={[
          {
            label: t('common.confirm'),
            variant: 'primary',
            testID: 'confirm-import',
            onPress: () => {
              if (!pending) return;
              try {
                replaceAll(pending);
              } catch (e) {
                console.warn('import', e);
                toast(t('data.importError'));
                setPending(null);
                return;
              }
              loadSettings();
              // A restored diary never sends the user back to the questionnaire.
              useSettings.getState().update({ onboarded: true });
              toast(
                t('data.imported', {
                  nights: t('common.nights', { count: pending.nights.length }),
                }),
              );
              setPending(null);
            },
          },
          { label: t('common.cancel'), onPress: () => setPending(null) },
        ]}
      />

      <Dialog
        visible={confirmWipe}
        title={t('data.wipe')}
        message={t('data.wipeConfirm')}
        onDismiss={() => setConfirmWipe(false)}
        actions={[
          {
            label: t('data.wipeAction'),
            variant: 'primary',
            testID: 'confirm-wipe',
            onPress: () => {
              wipe();
              loadSettings();
              setConfirmWipe(false);
              toast(t('data.wiped'));
              router.replace('/onboarding');
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmWipe(false) },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inset: { paddingHorizontal: space.lg, paddingBottom: space.md },
  busy: { marginTop: space.lg },
});
