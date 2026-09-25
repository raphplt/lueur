import i18n from '@/i18n';
import { night } from '@/domain/__tests__/helpers';

import { bandSvg, buildPdfHtml, escapeHtml } from '../pdf-html';

describe('PDF sleep diary', () => {
  const nights = [
    {
      ...night({ date: '2026-09-20', quality: 2, tags: ['t1'] }),
      note: 'Voisins <fête> & musique',
    },
    night({ date: '2026-09-22', latency: 45, awakenings: [{ at: '03:00', min: 20 }] }),
    night({ date: '2026-09-23', quality: 5 }),
  ];

  const build = (lng: 'fr' | 'en') =>
    buildPdfHtml({
      nights,
      from: '2026-09-19',
      to: '2026-09-23',
      tagLabel: (id) => (id === 't1' ? 'Bruit' : id),
      t: i18n.getFixedT(lng),
      locale: lng,
      hour12: lng === 'en',
      generatedAt: new Date(2026, 8, 25, 9),
      fonts: { display: 'AAAA' },
    });

  it('lists every day of the period, logged or not', () => {
    const html = build('fr');
    expect(html).toContain('Agenda du sommeil');
    expect(html).toContain('Du 19 septembre 2026 au 23 septembre 2026');
    expect(html.match(/<tr class="missing">/g)).toHaveLength(2);
    expect(html.match(/<tr class="difficult">/g)).toHaveLength(2);
    expect(html).toContain('23:00');
    expect(html).toContain('45&nbsp;min');
    expect(html).toContain('Bruit');
    expect(html).toContain('Ce document n’est pas un diagnostic');
    expect(html).toContain("font-family: 'LueurDisplay'");
    expect(html).not.toContain("font-family: 'LueurBody'");
  });

  it('escapes user text', () => {
    const html = build('fr');
    expect(html).toContain('Voisins &lt;fête&gt; &amp; musique');
    expect(html).not.toContain('<fête>');
    expect(escapeHtml(`"a'`)).toBe('&quot;a&#39;');
  });

  it('is fully translated in English with 12-hour times', () => {
    const html = build('en');
    expect(html).toContain('Sleep diary');
    expect(html).toContain('11:00 PM');
    expect(html).toContain('not logged');
    expect(html).not.toMatch(/nuit|Coucher|Sommeil/);
  });

  it('draws a band per night', () => {
    const svg = bandSvg(nights[1]!);
    expect(svg).toContain('<svg');
    expect(svg.match(/<rect/g)!.length).toBeGreaterThanOrEqual(5);
  });
});
