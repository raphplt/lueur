import { environmentComparison, tagCorrelations } from '@/domain/insights';
import { difficultFrequency } from '@/domain/metrics';
import { deviceZone } from '@/domain/time';

import { demoData, prng } from '../seed';

describe('demo data', () => {
  const data = demoData('2026-09-25', deviceZone);

  it('is deterministic', () => {
    expect(demoData('2026-09-25', deviceZone)).toEqual(data);
    const a = prng(1);
    const b = prng(1);
    expect([a(), a()]).toEqual([b(), b()]);
  });

  it('is a plausible diary that exercises every insight', () => {
    expect(data.nights.length).toBeGreaterThan(45);
    expect(data.nights.every((n) => n.wakeDate < '2026-09-25')).toBe(true);
    const freq = difficultFrequency(data.nights, '2026-09-25');
    expect(freq.current.difficult).toBeGreaterThan(0);
    expect(freq.previous.logged).toBeGreaterThan(0);
    const corr = tagCorrelations(data.nights, ['tag-noise']);
    expect(corr[0]?.sleepDeltaMin).toBeLessThan(0);
    const env = environmentComparison(data.nights, data.environmentChanges[0]!);
    expect(env.ready).toBe(true);
    expect(env.sleepDeltaMin).toBeGreaterThan(0);
  });
});
