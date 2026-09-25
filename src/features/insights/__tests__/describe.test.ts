import i18n from '@/i18n';
import { night } from '@/domain/__tests__/helpers';

import {
  describeCorrelation,
  describeDrift,
  describeNight,
  describeWeekendGap,
  tagLabel,
} from '../describe';

const fr = i18n.getFixedT('fr');
const en = i18n.getFixedT('en');
const tags = [
  { id: 't1', key: 'noise' as const, label: null, enabled: true, sortOrder: 0 },
  { id: 't2', key: null, label: 'Le chat', enabled: true, sortOrder: 1 },
];

describe('insight wording', () => {
  it('phrases correlations carefully, in both languages', () => {
    const c = {
      tagId: 't1',
      taggedNights: 9,
      untaggedNights: 20,
      sleepDeltaMin: -48,
      latencyDeltaMin: 15,
      difficultRateTagged: 0.67,
      difficultRateUntagged: 0.2,
    };
    expect(describeCorrelation(c, tags, fr, 'fr').main).toBe(
      'Les nuits marquées « Bruit » : 48 min de sommeil en moins en moyenne (9 nuits).',
    );
    expect(describeCorrelation(c, tags, en, 'en').detail).toBe(
      'Difficult nights: 67% with it, 20% without. Falling asleep takes 15 min longer on average.',
    );
    expect(
      describeCorrelation({ ...c, sleepDeltaMin: 20, latencyDeltaMin: 0 }, tags, en, 'en').main,
    ).toContain('more sleep');
  });

  it('labels built-in and personal tags', () => {
    expect(tagLabel(tags[0], fr)).toBe('Bruit');
    expect(tagLabel(tags[1], fr)).toBe('Le chat');
    expect(tagLabel(undefined, fr)).toBe('?');
  });

  it('describes drift and weekend gap', () => {
    expect(
      describeDrift({ direction: 'later', minutesPerWeek: 20, weeks: 3, nights: 18 }, fr, 'fr'),
    ).toBe('Votre heure de coucher recule d’environ 20 min par semaine depuis 3 semaines.');
    const gap = {
      weekdayMid: 900,
      weekendMid: 990,
      gapMin: 90,
      weekdayNights: 15,
      weekendNights: 6,
      notable: true,
    };
    expect(describeWeekendGap(gap, en, 'en')).toBe(
      'On weekends, the middle of your night shifts about 1h 30m later.',
    );
    expect(describeWeekendGap({ ...gap, gapMin: 20, notable: false }, fr, 'fr')).toContain(
      'proches',
    );
  });

  it('gives screen readers the whole night', () => {
    const text = describeNight(
      night({ date: '2026-09-25', quality: 4, awakenings: [{ at: '03:00', min: 20 }] }),
      fr,
      'fr',
      false,
    );
    expect(text).toContain('nuit du 24 au 25 sept.');
    expect(text).toContain('Au lit de 23:00 à 07:00');
    expect(text).toContain('1 réveil, 20 min en tout');
    expect(text).toContain('Ressenti : Plutôt bonne');
  });
});
