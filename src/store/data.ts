import { create } from 'zustand';

import * as repo from '@/db/repository';
import { draftToNight, type NightDraft } from '@/domain/draft';
import type { ExportData } from '@/domain/export-format';
import { uuid } from '@/domain/id';
import { deviceZone } from '@/domain/time';
import type { DateKey, DefaultTagKey, EnvironmentChange, Night, Tag } from '@/domain/types';

import { getDb } from './db-ref';

interface DataState {
  loaded: boolean;
  nights: Night[];
  tags: Tag[];
  environmentChanges: EnvironmentChange[];
  load: () => void;
  saveDraft: (draft: NightDraft) => Night;
  deleteNight: (id: string) => void;
  addTag: (label: string) => Tag;
  updateTag: (id: string, patch: Partial<Pick<Tag, 'label' | 'enabled' | 'sortOrder'>>) => void;
  deleteTag: (id: string) => void;
  setDefaultTagsEnabled: (keys: readonly DefaultTagKey[]) => void;
  saveEnvironmentChange: (
    change: Omit<EnvironmentChange, 'id' | 'createdAt'> & { id?: string },
  ) => void;
  deleteEnvironmentChange: (id: string) => void;
  replaceAll: (data: ExportData) => void;
  wipe: () => void;
}

export const useData = create<DataState>((set, get) => {
  const refresh = () => {
    const db = getDb();
    set({
      nights: repo.listNights(db),
      tags: repo.listTags(db),
      environmentChanges: repo.listEnvironmentChanges(db),
      loaded: true,
    });
  };

  return {
    loaded: false,
    nights: [],
    tags: [],
    environmentChanges: [],

    load: () => {
      const db = getDb();
      repo.ensureDefaultTags(db, Date.now());
      repo.closeDanglingWakeEvents(db);
      refresh();
    },

    saveDraft: (draft) => {
      const existing = get().nights.find((n) => n.wakeDate === draft.wakeDate) ?? null;
      const night = draftToNight(draft, {
        id: uuid(),
        now: Date.now(),
        zone: deviceZone,
        existing,
      });
      repo.saveNight(getDb(), night);
      refresh();
      return night;
    },

    deleteNight: (id) => {
      repo.deleteNight(getDb(), id);
      refresh();
    },

    addTag: (label) => {
      const tag = repo.addTag(getDb(), label, Date.now());
      refresh();
      return tag;
    },

    updateTag: (id, patch) => {
      repo.updateTag(getDb(), id, patch);
      refresh();
    },

    deleteTag: (id) => {
      repo.deleteTag(getDb(), id);
      refresh();
    },

    setDefaultTagsEnabled: (keys) => {
      repo.setTagsEnabled(getDb(), keys);
      refresh();
    },

    saveEnvironmentChange: (change) => {
      const existing = change.id
        ? get().environmentChanges.find((c) => c.id === change.id)
        : undefined;
      repo.saveEnvironmentChange(getDb(), {
        id: change.id ?? uuid(),
        date: change.date,
        label: change.label.trim(),
        note: change.note?.trim() ? change.note.trim() : null,
        createdAt: existing?.createdAt ?? Date.now(),
      });
      refresh();
    },

    deleteEnvironmentChange: (id) => {
      repo.deleteEnvironmentChange(getDb(), id);
      refresh();
    },

    replaceAll: (data) => {
      const db = getDb();
      repo.replaceAll(db, data, Date.now());
      repo.ensureDefaultTags(db, Date.now());
      refresh();
    },

    wipe: () => {
      const db = getDb();
      repo.wipeAll(db);
      repo.ensureDefaultTags(db, Date.now());
      refresh();
    },
  };
});

export function nightByDate(nights: Night[], date: DateKey): Night | undefined {
  return nights.find((n) => n.wakeDate === date);
}
