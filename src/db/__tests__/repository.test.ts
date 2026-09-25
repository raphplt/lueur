/**
 * @jest-environment node
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';

import { night } from '@/domain/__tests__/helpers';
import { DEFAULT_TAG_KEYS } from '@/domain/types';

import {
  addTag,
  closeDanglingWakeEvents,
  deleteEnvironmentChange,
  deleteNight,
  deleteTag,
  endWakeEvent,
  ensureDefaultTags,
  getNightByDate,
  listEnvironmentChanges,
  listNights,
  listTags,
  listUnassignedWakeEvents,
  listWakeEvents,
  readAll,
  readSettings,
  replaceAll,
  saveEnvironmentChange,
  saveNight,
  setTagsEnabled,
  startWakeEvent,
  updateTag,
  wipeAll,
  writeSettings,
  type LueurDb,
} from '../repository';
import { schema } from '../schema';

function openDb(): LueurDb {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../migrations') });
  return db as unknown as LueurDb;
}

describe('repository', () => {
  let db: LueurDb;
  beforeEach(() => {
    db = openDb();
    ensureDefaultTags(db, 1, ['noise', 'thoughts']);
  });

  it('creates default tags once, with chosen ones enabled', () => {
    ensureDefaultTags(db, 2);
    const tags = listTags(db);
    expect(tags).toHaveLength(DEFAULT_TAG_KEYS.length);
    expect(tags.filter((t) => t.enabled).map((t) => t.key)).toEqual(['noise', 'thoughts']);
    setTagsEnabled(db, ['heat']);
    expect(
      listTags(db)
        .filter((t) => t.enabled)
        .map((t) => t.key),
    ).toEqual(['heat']);
  });

  it('saves, reads and replaces nights by wake date', () => {
    const [noise] = listTags(db);
    const n = night({
      date: '2026-09-25',
      tags: [noise!.id],
      awakenings: [{ at: '03:00', min: 10 }],
    });
    saveNight(db, n);
    expect(getNightByDate(db, '2026-09-25')).toEqual(n);
    // Editing keeps one row per date; a new id for the same date replaces it.
    const other = { ...night({ date: '2026-09-25', quality: 5 }), tagIds: [] };
    saveNight(db, other);
    expect(listNights(db)).toEqual([other]);
    deleteNight(db, other.id);
    expect(getNightByDate(db, '2026-09-25')).toBeNull();
  });

  it('manages user tags and cascades links', () => {
    const tag = addTag(db, '  Chat  ', 3);
    expect(tag.label).toBe('Chat');
    updateTag(db, tag.id, { label: 'Le chat', enabled: false });
    const n = night({ date: '2026-09-25', tags: [tag.id] });
    saveNight(db, n);
    const builtin = listTags(db)[0]!;
    deleteTag(db, builtin.id); // ignored: built-in
    expect(listTags(db).some((t) => t.id === builtin.id)).toBe(true);
    deleteTag(db, tag.id);
    expect(getNightByDate(db, '2026-09-25')!.tagIds).toEqual([]);
  });

  it('records night-mode wake events and attaches them to the night', () => {
    const n = night({ date: '2026-09-25' });
    const ev = startWakeEvent(db, n.bedtimeAt + 3 * 3_600_000);
    endWakeEvent(db, ev.id, ev.startedAt + 20 * 60_000);
    const dangling = startWakeEvent(db, n.bedtimeAt + 5 * 3_600_000);
    closeDanglingWakeEvents(db, 30);
    expect(listUnassignedWakeEvents(db, n.bedtimeAt, n.outOfBedAt)).toHaveLength(2);
    saveNight(db, n);
    expect(listUnassignedWakeEvents(db, n.bedtimeAt, n.outOfBedAt)).toHaveLength(0);
    const all = listWakeEvents(db);
    expect(all.every((e) => e.nightId === n.id)).toBe(true);
    expect(all.find((e) => e.id === dangling.id)!.endedAt).toBe(dangling.startedAt + 30 * 60_000);
    // Deleting the night keeps the events, detached.
    deleteNight(db, n.id);
    expect(listWakeEvents(db).every((e) => e.nightId === null)).toBe(true);
  });

  it('stores the environment journal', () => {
    const change = { id: 'c', date: '2026-09-01', label: 'Bouchons', note: null, createdAt: 1 };
    saveEnvironmentChange(db, change);
    saveEnvironmentChange(db, { ...change, note: 'mousse' });
    expect(listEnvironmentChanges(db)).toEqual([{ ...change, note: 'mousse' }]);
    deleteEnvironmentChange(db, 'c');
    expect(listEnvironmentChanges(db)).toEqual([]);
  });

  it('stores settings as JSON', () => {
    writeSettings(db, { hour12: true, reminder: { enabled: true, clock: 480 }, skip: undefined });
    writeSettings(db, { hour12: false });
    expect(readSettings(db)).toEqual({ hour12: false, reminder: { enabled: true, clock: 480 } });
    // null means "back to default": the row is removed (NOT NULL column).
    writeSettings(db, { goal: 'understand' });
    writeSettings(db, { goal: null });
    expect(readSettings(db)).not.toHaveProperty('goal');
  });

  it('exports, wipes and restores everything', () => {
    const tag = addTag(db, 'Chat', 3);
    saveNight(db, night({ date: '2026-09-24', tags: [tag.id] }));
    saveNight(db, night({ date: '2026-09-25' }));
    saveEnvironmentChange(db, {
      id: 'c',
      date: '2026-09-01',
      label: 'x',
      note: null,
      createdAt: 1,
    });
    const ev = startWakeEvent(db, 5);
    endWakeEvent(db, ev.id, 10);
    writeSettings(db, { lang: 'fr' });
    const snapshot = readAll(db);

    wipeAll(db);
    expect(readAll(db)).toEqual({
      tags: [],
      nights: [],
      wakeEvents: [],
      environmentChanges: [],
      settings: {},
    });

    replaceAll(db, snapshot, 99);
    const restored = readAll(db);
    expect(restored.nights).toEqual(snapshot.nights);
    expect(restored.tags).toEqual(snapshot.tags);
    expect(restored.wakeEvents).toEqual(snapshot.wakeEvents);
    expect(restored.environmentChanges).toEqual(snapshot.environmentChanges);
    expect(restored.settings).toEqual({ lang: 'fr' });
  });

  it('rolls back a failed restore', () => {
    saveNight(db, night({ date: '2026-09-25' }));
    const before = readAll(db);
    const bad = { ...before, nights: [...before.nights, { ...before.nights[0]! }] };
    expect(() => replaceAll(db, bad, 1)).toThrow();
    expect(readAll(db)).toEqual(before);
  });
});
