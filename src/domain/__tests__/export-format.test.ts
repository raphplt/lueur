import {
  buildExport,
  CSV_COLUMNS,
  EXPORT_FORMAT,
  parseExport,
  parseIsoWithOffset,
  toCsv,
  toIsoWithOffset,
  type ExportData,
} from '../export-format';
import { fixedZone } from '../time';
import { night } from './helpers';

const data: ExportData = {
  tags: [
    { id: 't1', key: 'noise', label: null, enabled: true, sortOrder: 0 },
    { id: 't2', key: null, label: 'Chat, "Mistigri"', enabled: false, sortOrder: 1 },
  ],
  nights: [
    { ...night({ date: '2026-09-25', tags: ['t1', 't2'], quality: 2 }), note: 'Voisins; fête' },
    night({ date: '2026-03-29', awakenings: [{ at: '04:00', min: 20 }] }),
    night({ date: '2026-09-20', zone: fixedZone(-240) }),
  ],
  wakeEvents: [{ id: 'w1', startedAt: 1_700_000_000_000, endedAt: null, nightId: 'missing' }],
  environmentChanges: [
    {
      id: 'e1',
      date: '2026-09-01',
      label: 'Ventilateur',
      note: null,
      createdAt: 1_700_000_000_000,
    },
  ],
  settings: { hour12: false },
};

describe('ISO with offset', () => {
  it('formats and parses local time with offset', () => {
    const t = Date.UTC(2026, 8, 24, 21, 10, 5);
    expect(toIsoWithOffset(t, 120)).toBe('2026-09-24T23:10:05+02:00');
    expect(toIsoWithOffset(t, -270)).toBe('2026-09-24T16:40:05-04:30');
    expect(parseIsoWithOffset('2026-09-24T23:10:05+02:00')).toEqual({ instant: t, offsetMin: 120 });
    expect(parseIsoWithOffset('2026-09-24T21:10:05Z')).toEqual({ instant: t, offsetMin: 0 });
    expect(parseIsoWithOffset('2026-09-24T21:10:05.120Z')?.offsetMin).toBe(0);
    expect(parseIsoWithOffset('yesterday')).toBeNull();
  });
});

describe('JSON export', () => {
  const exported = buildExport(data, { now: Date.UTC(2026, 8, 25, 8), appVersion: '1.0.0' });

  it('produces a versioned, documented structure', () => {
    expect(exported.format).toBe(EXPORT_FORMAT);
    expect(exported.schemaVersion).toBe(1);
    expect(exported.exportedAt).toBe('2026-09-25T08:00:00.000Z');
    expect(exported.nights.map((n) => n.wakeDate)).toEqual([
      '2026-03-29',
      '2026-09-20',
      '2026-09-25',
    ]);
    const last = exported.nights[2]!;
    expect(last.bedtime).toBe('2026-09-24T23:00:00+02:00');
    expect(last.derived).toEqual({
      timeInBedMin: 480,
      totalSleepMin: 465,
      sleepEfficiency: 0.969,
      wasoMin: 0,
      awakeningCount: 0,
      difficult: true,
    });
    expect(exported.nights[0]!.bedtime).toBe('2026-03-28T23:00:00+01:00');
    expect(exported.nights[0]!.finalWake).toBe('2026-03-29T07:00:00+02:00');
    expect(exported.nights[1]!.bedtime).toBe('2026-09-19T23:00:00-04:00');
  });

  it('round-trips through JSON', () => {
    const parsed = parseExport(JSON.stringify(exported));
    if (!parsed.ok) throw new Error(parsed.errors.join());
    expect(parsed.data.tags).toEqual(data.tags);
    const byDate = (a: { wakeDate: string }, b: { wakeDate: string }) =>
      a.wakeDate < b.wakeDate ? -1 : 1;
    expect([...parsed.data.nights].sort(byDate)).toEqual([...data.nights].sort(byDate));
    expect(parsed.data.wakeEvents).toEqual([{ ...data.wakeEvents[0], nightId: null }]);
    expect(parsed.data.environmentChanges).toEqual(data.environmentChanges);
    expect(parsed.data.settings).toEqual({ hour12: false });
  });

  it('rejects foreign or broken files', () => {
    expect(parseExport('{')).toEqual({ ok: false, errors: ['notJson'] });
    expect(parseExport({ format: 'other' })).toEqual({ ok: false, errors: ['notLueur'] });
    expect(parseExport({ format: EXPORT_FORMAT, schemaVersion: 99 })).toEqual({
      ok: false,
      errors: ['unsupportedVersion'],
    });
    const broken = structuredClone(exported) as unknown as { nights: Record<string, unknown>[] };
    broken.nights[0]!.quality = 7;
    const res = parseExport(broken);
    expect(res.ok).toBe(false);
  });

  it('rejects inconsistent nights and duplicates', () => {
    const e = structuredClone(exported);
    e.nights[0]!.outOfBed = '2026-03-28T22:00:00+01:00';
    expect(parseExport(e)).toMatchObject({ ok: false, errors: ['nights[0]'] });
    const dup = structuredClone(exported);
    dup.nights.push({ ...dup.nights[0]!, id: 'other' });
    expect(parseExport(dup)).toMatchObject({ ok: false });
  });

  it('accepts minimal files and drops unknown tag references', () => {
    const res = parseExport({
      format: EXPORT_FORMAT,
      schemaVersion: 1,
      nights: [
        {
          id: 'n',
          wakeDate: '2026-09-25',
          bedtime: '2026-09-24T23:00:00+02:00',
          sleepLatencyMin: 10,
          awakenings: [],
          finalWake: '2026-09-25T07:00:00+02:00',
          outOfBed: '2026-09-25T07:10:00+02:00',
          quality: 4,
          tags: ['ghost'],
        },
      ],
    });
    if (!res.ok) throw new Error(res.errors.join());
    expect(res.data.nights[0]!.tagIds).toEqual([]);
    expect(res.data.nights[0]!.note).toBeNull();
    expect(res.data.tags).toEqual([]);
  });

  it('reports malformed collections', () => {
    const res = parseExport({
      format: EXPORT_FORMAT,
      schemaVersion: 1,
      tags: 'nope',
      wakeEvents: [{}],
    });
    expect(res).toEqual({ ok: false, errors: ['tags: not an array', 'wakeEvents[0]'] });
    const env = parseExport({
      format: EXPORT_FORMAT,
      schemaVersion: 1,
      environmentChanges: [{ id: 'x', date: 'bad', label: 'l' }],
      tags: [{ id: 'x', key: 'unknown', label: null }],
    });
    expect(env).toEqual({ ok: false, errors: ['tags[0]', 'environmentChanges[0]'] });
  });
});

describe('CSV export', () => {
  it('writes one escaped row per night', () => {
    const labels: Record<string, string> = { t1: 'bruit', t2: 'Chat, "Mistigri"' };
    const csv = toCsv(data.nights, (id) => labels[id] ?? id);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe(CSV_COLUMNS.join(','));
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe(
      '2026-09-25,2026-09-24T23:00:00+02:00,2026-09-24T23:15:00+02:00,2026-09-25T07:00:00+02:00,' +
        '2026-09-25T07:00:00+02:00,480,465,97,15,0,0,2,true,"bruit|Chat, ""Mistigri""","Voisins; fête"',
    );
  });
});
