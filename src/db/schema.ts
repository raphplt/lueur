import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Awakening, DefaultTagKey, Quality } from '@/domain/types';

/** One row per night, identified by the local date of the final wake-up. */
export const nights = sqliteTable(
  'nights',
  {
    id: text('id').primaryKey(),
    wakeDate: text('wake_date').notNull().unique(),
    bedtimeAt: integer('bedtime_at').notNull(),
    sleepLatencyMin: integer('sleep_latency_min').notNull(),
    awakenings: text('awakenings', { mode: 'json' }).$type<Awakening[]>().notNull(),
    finalWakeAt: integer('final_wake_at').notNull(),
    outOfBedAt: integer('out_of_bed_at').notNull(),
    quality: integer('quality').$type<Quality>().notNull(),
    note: text('note'),
    bedOffsetMin: integer('bed_offset_min').notNull(),
    wakeOffsetMin: integer('wake_offset_min').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('nights_bedtime_idx').on(t.bedtimeAt)],
);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  key: text('key').$type<DefaultTagKey>().unique(),
  label: text('label'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const nightTags = sqliteTable(
  'night_tags',
  {
    nightId: text('night_id')
      .notNull()
      .references(() => nights.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.nightId, t.tagId] }), index('night_tags_tag_idx').on(t.tagId)],
);

/** Awakenings recorded live by the "can't sleep" mode. */
export const wakeEvents = sqliteTable(
  'wake_events',
  {
    id: text('id').primaryKey(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    nightId: text('night_id').references(() => nights.id, { onDelete: 'set null' }),
  },
  (t) => [index('wake_events_started_idx').on(t.startedAt)],
);

export const environmentChanges = sqliteTable('environment_changes', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  label: text('label').notNull(),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
});

/** Key/value settings, values stored as JSON. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
});

export const schema = { nights, tags, nightTags, wakeEvents, environmentChanges, settings };
export type Schema = typeof schema;
