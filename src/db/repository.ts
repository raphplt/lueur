import { and, asc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { ExportData } from '@/domain/export-format';
import { uuid } from '@/domain/id';
import {
  DEFAULT_TAG_KEYS,
  type DateKey,
  type DefaultTagKey,
  type EnvironmentChange,
  type Instant,
  type Night,
  type Tag,
  type WakeEvent,
} from '@/domain/types';

import * as s from './schema';

/** Works with both the expo-sqlite driver (app) and better-sqlite3 (tests). */
export type LueurDb = BaseSQLiteDatabase<'sync', unknown, s.Schema>;

type NightRow = typeof s.nights.$inferSelect;
type TagRow = typeof s.tags.$inferSelect;

function rowToNight(row: NightRow, tagIds: string[]): Night {
  return { ...row, tagIds };
}

function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    key: row.key ?? null,
    label: row.label,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

function nightToRow(n: Night): NightRow {
  const { tagIds: _tagIds, ...row } = n;
  return row;
}

// ---------------------------------------------------------------------------
// Nights
// ---------------------------------------------------------------------------

function tagsByNight(db: LueurDb, nightIds?: string[]): Map<string, string[]> {
  const q = db.select().from(s.nightTags);
  const rows =
    nightIds === undefined ? q.all() : q.where(inArray(s.nightTags.nightId, nightIds)).all();
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.nightId) ?? [];
    list.push(r.tagId);
    map.set(r.nightId, list);
  }
  return map;
}

export function listNights(db: LueurDb): Night[] {
  const rows = db.select().from(s.nights).orderBy(asc(s.nights.wakeDate)).all();
  const tags = tagsByNight(db);
  return rows.map((r) => rowToNight(r, tags.get(r.id) ?? []));
}

export function getNightByDate(db: LueurDb, wakeDate: DateKey): Night | null {
  const row = db.select().from(s.nights).where(eq(s.nights.wakeDate, wakeDate)).get();
  if (!row) return null;
  return rowToNight(row, tagsByNight(db, [row.id]).get(row.id) ?? []);
}

/**
 * Inserts or replaces the night for its wake date, sets its tags and
 * attaches night-mode wake events that happened during it.
 */
export function saveNight(db: LueurDb, night: Night): void {
  db.transaction((tx) => {
    const existing = tx
      .select({ id: s.nights.id })
      .from(s.nights)
      .where(eq(s.nights.wakeDate, night.wakeDate))
      .get();
    if (existing && existing.id !== night.id) {
      tx.delete(s.nights).where(eq(s.nights.id, existing.id)).run();
    }
    const row = nightToRow(night);
    tx.insert(s.nights).values(row).onConflictDoUpdate({ target: s.nights.id, set: row }).run();
    tx.delete(s.nightTags).where(eq(s.nightTags.nightId, night.id)).run();
    if (night.tagIds.length > 0) {
      tx.insert(s.nightTags)
        .values(night.tagIds.map((tagId) => ({ nightId: night.id, tagId })))
        .run();
    }
    tx.update(s.wakeEvents)
      .set({ nightId: night.id })
      .where(
        and(
          isNull(s.wakeEvents.nightId),
          gte(s.wakeEvents.startedAt, night.bedtimeAt),
          lte(s.wakeEvents.startedAt, night.outOfBedAt),
        ),
      )
      .run();
  });
}

export function deleteNight(db: LueurDb, id: string): void {
  db.delete(s.nights).where(eq(s.nights.id, id)).run();
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export function listTags(db: LueurDb): Tag[] {
  return db
    .select()
    .from(s.tags)
    .orderBy(asc(s.tags.sortOrder), asc(s.tags.createdAt))
    .all()
    .map(rowToTag);
}

/** Creates missing built-in tags. `enabledKeys` limits which start enabled. */
export function ensureDefaultTags(
  db: LueurDb,
  now: Instant,
  enabledKeys: readonly DefaultTagKey[] = DEFAULT_TAG_KEYS,
): void {
  const present = new Set(
    db
      .select({ key: s.tags.key })
      .from(s.tags)
      .all()
      .map((r) => r.key),
  );
  const missing = DEFAULT_TAG_KEYS.filter((k) => !present.has(k));
  if (missing.length === 0) return;
  db.insert(s.tags)
    .values(
      missing.map((key) => ({
        id: uuid(),
        key,
        label: null,
        enabled: enabledKeys.includes(key),
        sortOrder: DEFAULT_TAG_KEYS.indexOf(key),
        createdAt: now,
      })),
    )
    .run();
}

export function addTag(db: LueurDb, label: string, now: Instant): Tag {
  const count = db.select({ id: s.tags.id }).from(s.tags).all().length;
  const row = {
    id: uuid(),
    key: null,
    label: label.trim(),
    enabled: true,
    sortOrder: count,
    createdAt: now,
  };
  db.insert(s.tags).values(row).run();
  return rowToTag(row);
}

export function updateTag(
  db: LueurDb,
  id: string,
  patch: Partial<Pick<Tag, 'label' | 'enabled' | 'sortOrder'>>,
): void {
  db.update(s.tags).set(patch).where(eq(s.tags.id, id)).run();
}

/** Only user tags can be deleted; built-in tags are disabled instead. */
export function deleteTag(db: LueurDb, id: string): void {
  db.delete(s.tags)
    .where(and(eq(s.tags.id, id), isNull(s.tags.key)))
    .run();
}

export function setTagsEnabled(db: LueurDb, enabledKeys: readonly DefaultTagKey[]): void {
  db.transaction((tx) => {
    for (const key of DEFAULT_TAG_KEYS) {
      tx.update(s.tags)
        .set({ enabled: enabledKeys.includes(key) })
        .where(eq(s.tags.key, key))
        .run();
    }
  });
}

// ---------------------------------------------------------------------------
// Wake events (night mode)
// ---------------------------------------------------------------------------

export function startWakeEvent(db: LueurDb, at: Instant): WakeEvent {
  const ev: WakeEvent = { id: uuid(), startedAt: at, endedAt: null, nightId: null };
  db.insert(s.wakeEvents).values(ev).run();
  return ev;
}

export function endWakeEvent(db: LueurDb, id: string, at: Instant): void {
  db.update(s.wakeEvents).set({ endedAt: at }).where(eq(s.wakeEvents.id, id)).run();
}

/**
 * Closes events left open (app killed during night mode) with a bounded
 * duration so they stay plausible.
 */
export function closeDanglingWakeEvents(db: LueurDb, maxDurationMin = 60): void {
  const open = db.select().from(s.wakeEvents).where(isNull(s.wakeEvents.endedAt)).all();
  for (const e of open) {
    db.update(s.wakeEvents)
      .set({ endedAt: e.startedAt + maxDurationMin * 60_000 })
      .where(eq(s.wakeEvents.id, e.id))
      .run();
  }
}

export function listUnassignedWakeEvents(db: LueurDb, from: Instant, to: Instant): WakeEvent[] {
  return db
    .select()
    .from(s.wakeEvents)
    .where(
      and(
        isNull(s.wakeEvents.nightId),
        gte(s.wakeEvents.startedAt, from),
        lte(s.wakeEvents.startedAt, to),
      ),
    )
    .orderBy(asc(s.wakeEvents.startedAt))
    .all();
}

export function listWakeEvents(db: LueurDb): WakeEvent[] {
  return db.select().from(s.wakeEvents).orderBy(asc(s.wakeEvents.startedAt)).all();
}

// ---------------------------------------------------------------------------
// Environment journal
// ---------------------------------------------------------------------------

export function listEnvironmentChanges(db: LueurDb): EnvironmentChange[] {
  return db.select().from(s.environmentChanges).orderBy(asc(s.environmentChanges.date)).all();
}

export function saveEnvironmentChange(db: LueurDb, change: EnvironmentChange): void {
  db.insert(s.environmentChanges)
    .values(change)
    .onConflictDoUpdate({ target: s.environmentChanges.id, set: change })
    .run();
}

export function deleteEnvironmentChange(db: LueurDb, id: string): void {
  db.delete(s.environmentChanges).where(eq(s.environmentChanges.id, id)).run();
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function readSettings(db: LueurDb): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of db.select().from(s.settings).all()) out[r.key] = r.value;
  return out;
}

export function writeSettings(db: LueurDb, values: Record<string, unknown>): void {
  db.transaction((tx) => {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) continue;
      tx.insert(s.settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: s.settings.key, set: { value } })
        .run();
    }
  });
}

// ---------------------------------------------------------------------------
// Whole database
// ---------------------------------------------------------------------------

export function readAll(db: LueurDb): ExportData {
  return {
    tags: listTags(db),
    nights: listNights(db),
    wakeEvents: listWakeEvents(db),
    environmentChanges: listEnvironmentChanges(db),
    settings: readSettings(db),
  };
}

export function wipeAll(db: LueurDb): void {
  db.transaction((tx) => {
    tx.delete(s.nightTags).run();
    tx.delete(s.wakeEvents).run();
    tx.delete(s.nights).run();
    tx.delete(s.tags).run();
    tx.delete(s.environmentChanges).run();
    tx.delete(s.settings).run();
  });
}

/** Replaces every table with `data` (restore from an export), atomically. */
export function replaceAll(db: LueurDb, data: ExportData, now: Instant): void {
  db.transaction((tx) => {
    tx.delete(s.nightTags).run();
    tx.delete(s.wakeEvents).run();
    tx.delete(s.nights).run();
    tx.delete(s.tags).run();
    tx.delete(s.environmentChanges).run();
    tx.delete(s.settings).run();
    if (data.tags.length > 0) {
      tx.insert(s.tags)
        .values(data.tags.map((t) => ({ ...t, createdAt: now })))
        .run();
    }
    for (const n of data.nights) {
      tx.insert(s.nights).values(nightToRow(n)).run();
      if (n.tagIds.length > 0) {
        tx.insert(s.nightTags)
          .values(n.tagIds.map((tagId) => ({ nightId: n.id, tagId })))
          .run();
      }
    }
    if (data.wakeEvents.length > 0) tx.insert(s.wakeEvents).values(data.wakeEvents).run();
    if (data.environmentChanges.length > 0) {
      tx.insert(s.environmentChanges).values(data.environmentChanges).run();
    }
    for (const [key, value] of Object.entries(data.settings)) {
      tx.insert(s.settings).values({ key, value }).run();
    }
  });
}
