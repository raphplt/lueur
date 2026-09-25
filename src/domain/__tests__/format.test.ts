import {
  formatClock,
  formatClockFromNoon,
  formatDateKey,
  formatDuration,
  formatPercent,
  nightLabel,
} from '../format';

describe('format', () => {
  it('formats durations', () => {
    expect(formatDuration(400, 'fr')).toBe('6 h 40');
    expect(formatDuration(45, 'fr')).toBe('45 min');
    expect(formatDuration(420, 'fr')).toBe('7 h');
    expect(formatDuration(-65, 'fr')).toBe('1 h 05');
    expect(formatDuration(400, 'en')).toBe('6h 40m');
    expect(formatDuration(420, 'en')).toBe('7h');
    expect(formatDuration(5, 'en')).toBe('5 min');
  });

  it('formats clock times', () => {
    expect(formatClock(23 * 60 + 5, false)).toBe('23:05');
    expect(formatClock(-30, false)).toBe('23:30');
    expect(formatClock(0, true)).toBe('12:00 AM');
    expect(formatClock(13 * 60 + 15, true)).toBe('1:15 PM');
    expect(formatClockFromNoon(810, false)).toBe('01:30');
  });

  it('formats percentages', () => {
    expect(formatPercent(0.873, 'fr')).toBe('87 %');
    expect(formatPercent(0.873, 'en')).toBe('87%');
  });

  it('labels nights', () => {
    expect(nightLabel('2026-09-25', 'fr')).toBe('nuit du 24 au 25 sept.');
    expect(nightLabel('2026-09-01', 'fr')).toBe('nuit du 31 août au 1er sept.');
    expect(nightLabel('2026-09-25', 'en')).toBe('night of 24–25 Sep');
    expect(nightLabel('2026-10-01', 'en')).toBe('night of 30 Sep – 1 Oct');
  });

  it('formats date keys', () => {
    expect(formatDateKey('2026-09-25', 'EEEE d MMMM', 'fr')).toBe('vendredi 25 septembre');
    expect(formatDateKey('2026-09-25', 'EEE d', 'en')).toBe('Fri 25');
  });
});
