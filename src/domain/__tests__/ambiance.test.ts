import { ambianceAt, ambientLight, isNightTime, resolveAmbiance } from '../ambiance';
import { uuid } from '../id';

describe('ambiance', () => {
  const rise = 7 * 60 + 30;
  it('switches to ink in the evening and back one hour before rising', () => {
    expect(ambianceAt(12 * 60, rise)).toBe('dawn');
    expect(ambianceAt(19 * 60 + 29, rise)).toBe('dawn');
    expect(ambianceAt(19 * 60 + 30, rise)).toBe('ink');
    expect(ambianceAt(3 * 60, rise)).toBe('ink');
    expect(ambianceAt(6 * 60 + 29, rise)).toBe('ink');
    expect(ambianceAt(6 * 60 + 30, rise)).toBe('dawn');
  });

  it('handles late risers (dawn after the ink start)', () => {
    expect(ambianceAt(20 * 60, 22 * 60)).toBe('ink');
    expect(ambianceAt(21 * 60 + 30, 22 * 60)).toBe('dawn');
  });

  it('respects a forced preference', () => {
    expect(resolveAmbiance('ink', 12 * 60, rise)).toBe('ink');
    expect(resolveAmbiance('dawn', 2 * 60, rise)).toBe('dawn');
    expect(resolveAmbiance('auto', 2 * 60, rise)).toBe('ink');
  });

  it('computes a continuous ambient light', () => {
    const noon = ambientLight(13 * 60);
    const night = ambientLight(60);
    const dusk = ambientLight(20 * 60);
    expect(noon.elevation).toBeCloseTo(1);
    expect(night.elevation).toBeCloseTo(0);
    expect(dusk.intensity).toBeGreaterThan(noon.intensity);
    expect(dusk.intensity).toBeLessThanOrEqual(1);
  });

  it('knows when it is night', () => {
    expect(isNightTime(23 * 60)).toBe(true);
    expect(isNightTime(3 * 60)).toBe(true);
    expect(isNightTime(8 * 60)).toBe(false);
  });
});

describe('uuid', () => {
  it('generates v4 identifiers', () => {
    const id = uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuid()).not.toBe(id);
  });
});
