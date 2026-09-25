import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import type { LueurDb } from './repository';
import { schema } from './schema';

export const DATABASE_NAME = 'lueur.db';

const sqlite = openDatabaseSync(DATABASE_NAME);
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const expoDb = drizzle(sqlite, { schema });

/** The single database used by the app. Local file, never synced. */
export const db = expoDb as unknown as LueurDb;
