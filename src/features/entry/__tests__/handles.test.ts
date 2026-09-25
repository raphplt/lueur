import type { NightDraft } from '@/domain/draft';

import { addAwakeningInLongestGap, handleMinute, moveHandle } from '../handles';

const axis = { fromMin: -300, toMin: 720 };
const d: NightDraft = {
  wakeDate: '2026-09-25',
  bedMin: -60,
  latencyMin: 20,
  awakenings: [{ startMin: 120, durationMin: 20 }],
  finalWakeMin: 420,
  outOfBedMin: 440,
  quality: null,
  tagIds: [],
  note: '',
};

describe('moveHandle', () => {
  it('moves bedtime while keeping the onset in place', () => {
    const r = moveHandle(d, 'bed', -90, axis);
    expect(r.bedMin).toBe(-90);
    expect(handleMinute(r, 'onset')).toBe(-40);
    expect(r.latencyMin).toBe(50);
  });

  it('pushes the onset along when bedtime passes it', () => {
    const r = moveHandle(d, 'bed', 0, axis);
    expect(r.latencyMin).toBe(0);
    expect(handleMinute(r, 'onset')).toBe(0);
  });

  it('keeps the onset between bed and wake', () => {
    expect(handleMinute(moveHandle(d, 'onset', -200, axis), 'onset')).toBe(-60);
    expect(handleMinute(moveHandle(d, 'onset', 600, axis), 'onset')).toBe(415);
  });

  it('pushes getting up along with a later wake, and drops awakenings that no longer fit', () => {
    const r = moveHandle(d, 'wake', 480, axis);
    expect(r.outOfBedMin).toBe(480);
    const early = moveHandle(d, 'wake', 100, axis);
    expect(early.awakenings).toEqual([]);
  });

  it('never puts getting up before waking, and clamps to the axis', () => {
    expect(moveHandle(d, 'out', 300, axis).outOfBedMin).toBe(420);
    expect(moveHandle(d, 'out', 9999, axis).outOfBedMin).toBe(720);
    expect(moveHandle(d, 'bed', -9999, axis).bedMin).toBe(-300);
  });
});

describe('addAwakeningInLongestGap', () => {
  it('adds one in the longest sleep stretch', () => {
    const r = addAwakeningInLongestGap(d, 15);
    expect(r.awakenings).toHaveLength(2);
    // Longest stretch is 140 → 420; middle ≈ 272.
    expect(r.awakenings[1]).toEqual({ startMin: 275, durationMin: 15 });
  });

  it('uses the first stretch when it is the longest', () => {
    const r = addAwakeningInLongestGap(
      { ...d, awakenings: [{ startMin: 380, durationMin: 20 }] },
      15,
    );
    expect(r.awakenings[0]!.startMin).toBeLessThan(380);
  });

  it('does nothing when there is no room', () => {
    const tiny = { ...d, bedMin: 400, latencyMin: 0, awakenings: [] };
    expect(addAwakeningInLongestGap(tiny, 15)).toBe(tiny);
  });
});
