import { nightMetrics } from './metrics';
import { isDateKey, MINUTE, wallClock } from './time';
import {
  DEFAULT_TAG_KEYS,
  type Awakening,
  type DefaultTagKey,
  type EnvironmentChange,
  type Night,
  type Quality,
  type Tag,
  type WakeEvent,
} from './types';

export const EXPORT_FORMAT = 'lueur.export';
export const EXPORT_SCHEMA_VERSION = 1;

/** Documented in docs/DATA_FORMAT.md. Keep backward compatible. */
export interface ExportV1 {
  format: typeof EXPORT_FORMAT;
  schemaVersion: 1;
  exportedAt: string;
  app: { name: 'Lueur'; version: string };
  tags: ExportTag[];
  nights: ExportNight[];
  wakeEvents: ExportWakeEvent[];
  environmentChanges: ExportEnvironmentChange[];
  settings: Record<string, unknown>;
}

export interface ExportTag {
  id: string;
  key: DefaultTagKey | null;
  label: string | null;
  enabled: boolean;
  sortOrder: number;
}

export interface ExportNight {
  id: string;
  wakeDate: string;
  bedtime: string;
  sleepLatencyMin: number;
  awakenings: Awakening[];
  finalWake: string;
  outOfBed: string;
  quality: Quality;
  note: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** Informational, recomputed on import. */
  derived: {
    timeInBedMin: number;
    totalSleepMin: number;
    sleepEfficiency: number;
    wasoMin: number;
    awakeningCount: number;
    difficult: boolean;
  };
}

export interface ExportWakeEvent {
  id: string;
  startedAt: string;
  endedAt: string | null;
  nightId: string | null;
}

export interface ExportEnvironmentChange {
  id: string;
  date: string;
  label: string;
  note: string | null;
  createdAt: string;
}

export interface ExportData {
  tags: Tag[];
  nights: Night[];
  wakeEvents: WakeEvent[];
  environmentChanges: EnvironmentChange[];
  settings: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ISO 8601 with offset
// ---------------------------------------------------------------------------

/** "2026-09-24T23:10:00+02:00" */
export function toIsoWithOffset(instant: number, offsetMin: number): string {
  const { date, minuteOfDay } = wallClock(instant, offsetMin);
  const seconds = Math.floor((((instant % MINUTE) + MINUTE) % MINUTE) / 1000);
  const hh = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const mm = String(minuteOfDay % 60).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  return `${date}T${hh}:${mm}:${ss}${sign}${oh}:${om}`;
}

const ISO_OFFSET_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|([+-])(\d{2}):?(\d{2}))$/;

export function parseIsoWithOffset(value: string): { instant: number; offsetMin: number } | null {
  const m = ISO_OFFSET_RE.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z, sign, oh, om] = m;
  const offsetMin = z === 'Z' ? 0 : (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om));
  const local = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s ?? 0),
  );
  if (Number.isNaN(local)) return null;
  return { instant: local - offsetMin * MINUTE, offsetMin };
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildExport(data: ExportData, meta: { now: number; appVersion: string }): ExportV1 {
  const utc = (t: number) => new Date(t).toISOString();
  return {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: utc(meta.now),
    app: { name: 'Lueur', version: meta.appVersion },
    tags: data.tags.map((t) => ({
      id: t.id,
      key: t.key,
      label: t.label,
      enabled: t.enabled,
      sortOrder: t.sortOrder,
    })),
    nights: [...data.nights]
      .sort((a, b) => (a.wakeDate < b.wakeDate ? -1 : 1))
      .map((n) => {
        const m = nightMetrics(n);
        return {
          id: n.id,
          wakeDate: n.wakeDate,
          bedtime: toIsoWithOffset(n.bedtimeAt, n.bedOffsetMin),
          sleepLatencyMin: n.sleepLatencyMin,
          awakenings: n.awakenings.map((a) => ({ ...a })),
          finalWake: toIsoWithOffset(n.finalWakeAt, n.wakeOffsetMin),
          outOfBed: toIsoWithOffset(n.outOfBedAt, n.wakeOffsetMin),
          quality: n.quality,
          note: n.note,
          tags: [...n.tagIds],
          createdAt: utc(n.createdAt),
          updatedAt: utc(n.updatedAt),
          derived: {
            timeInBedMin: Math.round(m.timeInBedMin),
            totalSleepMin: Math.round(m.totalSleepMin),
            sleepEfficiency: Math.round(m.efficiency * 1000) / 1000,
            wasoMin: m.wasoMin,
            awakeningCount: m.awakeningCount,
            difficult: m.isDifficult,
          },
        };
      }),
    wakeEvents: data.wakeEvents.map((e) => ({
      id: e.id,
      startedAt: utc(e.startedAt),
      endedAt: e.endedAt === null ? null : utc(e.endedAt),
      nightId: e.nightId,
    })),
    environmentChanges: data.environmentChanges.map((c) => ({
      id: c.id,
      date: c.date,
      label: c.label,
      note: c.note,
      createdAt: utc(c.createdAt),
    })),
    settings: data.settings,
  };
}

// ---------------------------------------------------------------------------
// Parse & validate
// ---------------------------------------------------------------------------

export type ParseResult = { ok: true; data: ExportData } | { ok: false; errors: string[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNullableStr = (v: unknown): v is string | null => v === null || isStr(v);

function parseUtc(v: unknown): number | null {
  if (!isStr(v)) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/** Parses and validates an export file. Accepts current and older schema versions. */
export function parseExport(raw: string | unknown): ParseResult {
  let json: unknown = raw;
  if (typeof raw === 'string') {
    try {
      json = JSON.parse(raw);
    } catch {
      return { ok: false, errors: ['notJson'] };
    }
  }
  if (!isObj(json) || json.format !== EXPORT_FORMAT) return { ok: false, errors: ['notLueur'] };
  if (!isNum(json.schemaVersion) || json.schemaVersion > EXPORT_SCHEMA_VERSION) {
    return { ok: false, errors: ['unsupportedVersion'] };
  }
  const errors: string[] = [];
  const tags: Tag[] = [];
  const nights: Night[] = [];
  const wakeEvents: WakeEvent[] = [];
  const environmentChanges: EnvironmentChange[] = [];

  const arr = (k: string): unknown[] => {
    const v = json[k];
    if (v === undefined) return [];
    if (!Array.isArray(v)) {
      errors.push(`${k}: not an array`);
      return [];
    }
    return v;
  };

  arr('tags').forEach((t, i) => {
    if (
      !isObj(t) ||
      !isStr(t.id) ||
      !isNullableStr(t.label) ||
      !(
        t.key === null ||
        (isStr(t.key) && (DEFAULT_TAG_KEYS as readonly string[]).includes(t.key))
      ) ||
      (t.key === null && !isStr(t.label))
    ) {
      errors.push(`tags[${i}]`);
      return;
    }
    tags.push({
      id: t.id,
      key: t.key as DefaultTagKey | null,
      label: t.label,
      enabled: t.enabled !== false,
      sortOrder: isNum(t.sortOrder) ? t.sortOrder : i,
    });
  });
  const tagIds = new Set(tags.map((t) => t.id));

  const seenDates = new Set<string>();
  arr('nights').forEach((n, i) => {
    const bed = isObj(n) && isStr(n.bedtime) ? parseIsoWithOffset(n.bedtime) : null;
    const wake = isObj(n) && isStr(n.finalWake) ? parseIsoWithOffset(n.finalWake) : null;
    const out = isObj(n) && isStr(n.outOfBed) ? parseIsoWithOffset(n.outOfBed) : null;
    if (
      !isObj(n) ||
      !isStr(n.id) ||
      !isDateKey(n.wakeDate) ||
      !bed ||
      !wake ||
      !out ||
      !isNum(n.sleepLatencyMin) ||
      n.sleepLatencyMin < 0 ||
      !Array.isArray(n.awakenings) ||
      !n.awakenings.every(
        (a) => isObj(a) && isNum(a.offsetMin) && isNum(a.durationMin) && a.durationMin >= 0,
      ) ||
      !isNum(n.quality) ||
      ![1, 2, 3, 4, 5].includes(n.quality) ||
      !isNullableStr(n.note ?? null) ||
      !(bed.instant < wake.instant && wake.instant <= out.instant)
    ) {
      errors.push(`nights[${i}]`);
      return;
    }
    if (seenDates.has(n.wakeDate)) {
      errors.push(`nights[${i}]: duplicate ${n.wakeDate}`);
      return;
    }
    seenDates.add(n.wakeDate);
    const nightTags = Array.isArray(n.tags) ? n.tags.filter(isStr) : [];
    const created = parseUtc(n.createdAt) ?? bed.instant;
    nights.push({
      id: n.id,
      wakeDate: n.wakeDate,
      bedtimeAt: bed.instant,
      sleepLatencyMin: n.sleepLatencyMin,
      awakenings: (n.awakenings as Obj[]).map((a) => ({
        offsetMin: a.offsetMin as number,
        durationMin: a.durationMin as number,
      })),
      finalWakeAt: wake.instant,
      outOfBedAt: out.instant,
      quality: n.quality as Quality,
      note: (n.note as string | null | undefined) ?? null,
      bedOffsetMin: bed.offsetMin,
      wakeOffsetMin: wake.offsetMin,
      tagIds: nightTags.filter((id) => tagIds.has(id)),
      createdAt: created,
      updatedAt: parseUtc(n.updatedAt) ?? created,
    });
  });
  const nightIds = new Set(nights.map((n) => n.id));

  arr('wakeEvents').forEach((e, i) => {
    const started = isObj(e) ? parseUtc(e.startedAt) : null;
    if (!isObj(e) || !isStr(e.id) || started === null) {
      errors.push(`wakeEvents[${i}]`);
      return;
    }
    const nightId = isStr(e.nightId) && nightIds.has(e.nightId) ? e.nightId : null;
    wakeEvents.push({ id: e.id, startedAt: started, endedAt: parseUtc(e.endedAt), nightId });
  });

  arr('environmentChanges').forEach((c, i) => {
    if (!isObj(c) || !isStr(c.id) || !isDateKey(c.date) || !isStr(c.label)) {
      errors.push(`environmentChanges[${i}]`);
      return;
    }
    environmentChanges.push({
      id: c.id,
      date: c.date,
      label: c.label,
      note: isStr(c.note) ? c.note : null,
      createdAt: parseUtc(c.createdAt) ?? Date.now(),
    });
  });

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      tags,
      nights,
      wakeEvents,
      environmentChanges,
      settings: isObj(json.settings) ? json.settings : {},
    },
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export const CSV_COLUMNS = [
  'wake_date',
  'bedtime',
  'sleep_onset',
  'final_wake',
  'out_of_bed',
  'time_in_bed_min',
  'total_sleep_min',
  'sleep_efficiency_pct',
  'sleep_latency_min',
  'awakenings',
  'waso_min',
  'quality_1_5',
  'difficult',
  'tags',
  'note',
] as const;

function csvCell(v: string | number | boolean | null): string {
  if (v === null) return '';
  const s = String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(nights: Night[], tagLabel: (tagId: string) => string): string {
  const rows = [...nights]
    .sort((a, b) => (a.wakeDate < b.wakeDate ? -1 : 1))
    .map((n) => {
      const m = nightMetrics(n);
      return [
        n.wakeDate,
        toIsoWithOffset(n.bedtimeAt, n.bedOffsetMin),
        toIsoWithOffset(n.bedtimeAt + n.sleepLatencyMin * MINUTE, n.bedOffsetMin),
        toIsoWithOffset(n.finalWakeAt, n.wakeOffsetMin),
        toIsoWithOffset(n.outOfBedAt, n.wakeOffsetMin),
        Math.round(m.timeInBedMin),
        Math.round(m.totalSleepMin),
        Math.round(m.efficiency * 100),
        n.sleepLatencyMin,
        m.awakeningCount,
        m.wasoMin,
        n.quality,
        m.isDifficult,
        n.tagIds.map(tagLabel).join('|'),
        n.note,
      ]
        .map(csvCell)
        .join(',');
    });
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}
