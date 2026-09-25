import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { readAll } from '@/db/repository';
import { buildExport, parseExport, toCsv, type ExportData } from '@/domain/export-format';
import type { AppLocale } from '@/domain/format';
import { addDays, dateKeyOf } from '@/domain/time';
import type { Tag } from '@/domain/types';
import { tagLabel } from '@/features/insights/describe';
import i18n from '@/i18n';
import { getDb } from '@/store/db-ref';

import { buildPdfHtml } from './pdf-html';

const today = () => dateKeyOf(Date.now());

function writeCache(name: string, content: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  return file;
}

function labeler(tags: Tag[]) {
  const t = i18n.t.bind(i18n);
  const byId = new Map(tags.map((x) => [x.id, x]));
  return (id: string) => tagLabel(byId.get(id), t);
}

export async function shareJsonBackup(): Promise<void> {
  const data = readAll(getDb());
  const json = buildExport(data, {
    now: Date.now(),
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
  });
  const file = writeCache(`lueur-${today()}.json`, JSON.stringify(json, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

export async function shareCsv(): Promise<void> {
  const data = readAll(getDb());
  const file = writeCache(`lueur-${today()}.csv`, toCsv(data.nights, labeler(data.tags)));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}

async function fontBase64(module: number): Promise<string | undefined> {
  try {
    const [asset] = await Asset.loadAsync(module);
    return asset?.localUri ? await new File(asset.localUri).base64() : undefined;
  } catch {
    return undefined;
  }
}

/** Sleep diary of the last `weeks` weeks, as a PDF a health professional can read. */
export async function sharePdf(weeks: number, locale: AppLocale, hour12: boolean): Promise<void> {
  const data = readAll(getDb());
  const to = today();
  const from = addDays(to, -(weeks * 7 - 1));
  const [display, body] = await Promise.all([
    fontBase64(require('../../assets/fonts/YoungSerif-Regular.ttf')),
    fontBase64(require('../../assets/fonts/YsabeauOffice-Regular.ttf')),
  ]);
  const html = buildPdfHtml({
    nights: data.nights,
    from,
    to,
    tagLabel: labeler(data.tags),
    t: i18n.getFixedT(locale),
    locale,
    hour12,
    generatedAt: new Date(),
    fonts: { display, body },
  });
  // A4 landscape, in points.
  const { uri } = await Print.printToFileAsync({ html, width: 842, height: 595 });
  const printed = new File(uri);
  const target = new File(Paths.cache, `lueur-${locale === 'fr' ? 'agenda' : 'diary'}-${to}.pdf`);
  if (target.exists) target.delete();
  printed.move(target);
  await Sharing.shareAsync(target.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}

export type PickResult =
  { status: 'cancelled' } | { status: 'invalid' } | { status: 'ok'; data: ExportData };

export async function pickBackup(): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets[0]) return { status: 'cancelled' };
  try {
    const text = await new File(res.assets[0].uri).text();
    const parsed = parseExport(text);
    return parsed.ok ? { status: 'ok', data: parsed.data } : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}
