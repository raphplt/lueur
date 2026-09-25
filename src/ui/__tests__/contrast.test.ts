import { colors, insomniaColors } from '../tokens';

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('WCAG contrast (docs/DESIGN.md §3)', () => {
  for (const [name, c] of Object.entries(colors)) {
    describe(name, () => {
      it.each([
        ['text', 'bg'],
        ['text', 'bgRaised'],
        ['textMuted', 'bg'],
        ['textMuted', 'bgRaised'],
        ['lightText', 'bg'],
        ['lightText', 'bgRaised'],
        ['calmText', 'bg'],
        ['lightOn', 'light'],
      ] as const)('%s on %s ≥ 4.5', (fg, bg) => {
        expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
      });

      it('faint text stays ≥ 3 (large text and captions only)', () => {
        expect(contrast(c.textFaint, c.bg)).toBeGreaterThanOrEqual(3);
        expect(contrast(c.textFaint, c.bgRaised)).toBeGreaterThanOrEqual(3);
      });

      it('the light source stands out from the background (≥ 3, non-text)', () => {
        expect(contrast(c.light, c.bg)).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it('insomnia text is legible on its background', () => {
    expect(contrast(insomniaColors.text, insomniaColors.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
