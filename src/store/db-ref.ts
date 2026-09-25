import type { LueurDb } from '@/db/repository';

let current: LueurDb | null = null;

/** Injected at startup (app) or in tests, so stores never import the native client directly. */
export function setDb(db: LueurDb): void {
  current = db;
}

export function getDb(): LueurDb {
  if (!current) throw new Error('Database not initialised');
  return current;
}
