import { planReminders } from '../reminders';
import { deviceZone, wallClock } from '../time';

describe('planReminders', () => {
  const at = (date: string, min: number) => deviceZone.toInstant(date, min);

  it('plans one reminder per day at the local clock time', () => {
    const plan = planReminders({ now: at('2026-09-25', 6 * 60), clock: 8 * 60, zone: deviceZone });
    expect(plan).toHaveLength(14);
    expect(plan[0]).toEqual({ date: '2026-09-25', at: at('2026-09-25', 480) });
    expect(plan[13]!.date).toBe('2026-10-08');
  });

  it('starts tomorrow when today is past, and skips logged mornings', () => {
    const plan = planReminders({
      now: at('2026-09-25', 9 * 60),
      clock: 8 * 60,
      zone: deviceZone,
      skip: new Set(['2026-09-26']),
      days: 4,
    });
    expect(plan.map((p) => p.date)).toEqual(['2026-09-27', '2026-09-28']);
  });

  it('keeps the local hour across a DST change', () => {
    const plan = planReminders({
      now: at('2026-10-23', 12 * 60),
      clock: 8 * 60,
      zone: deviceZone,
      days: 5,
    });
    for (const p of plan) {
      expect(wallClock(p.at, deviceZone.offsetAt(p.at)).minuteOfDay).toBe(480);
    }
    expect(plan[1]!.at - plan[0]!.at).toBe(25 * 3_600_000);
  });
});
