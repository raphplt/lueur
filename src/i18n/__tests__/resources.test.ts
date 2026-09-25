import { PHRASE_COUNTS } from '@/domain/insights';

import en from '../en';
import fr from '../fr';

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('translations', () => {
  it('have the same keys in French and English', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it('have the phrase bank sizes the domain expects', () => {
    for (const bank of [fr.phrases, en.phrases]) {
      for (const [category, count] of Object.entries(PHRASE_COUNTS)) {
        expect(bank[category as keyof typeof bank]).toHaveLength(count);
      }
    }
  });

  it('never use exclamation marks (tone, DESIGN §13)', () => {
    const all = JSON.stringify([fr, en]);
    expect(all).not.toMatch(/!/);
  });

  it('contain no empty strings', () => {
    const walk = (o: unknown): string[] =>
      typeof o === 'string'
        ? [o]
        : typeof o === 'object' && o
          ? Object.values(o).flatMap(walk)
          : [];
    for (const s of [...walk(fr), ...walk(en)]) expect(s.trim().length).toBeGreaterThan(0);
  });
});
