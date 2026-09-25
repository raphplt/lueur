#!/usr/bin/env python3
"""
Frames raw app captures for the stores, in Lueur's art direction:
paper or ink background, faint grain, warm glow, a Young Serif caption.

  python3 scripts/frame-screenshots.py            # all languages found in e2e/screenshots/raw/
Outputs:
  fastlane/screenshots/ios/<locale>/NN-name_{6.9,6.5}.png          (1320×2868, 1284×2778)
  fastlane/metadata/android/<locale>/images/phoneScreenshots/NN.png (1080×2160)
Needs Pillow.
"""
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'e2e', 'screenshots', 'raw')
DISPLAY = os.path.join(ROOT, 'assets', 'fonts', 'YoungSerif-Regular.ttf')
BODY = os.path.join(ROOT, 'assets', 'fonts', 'YsabeauOffice-Regular.ttf')

PAPER, INK, AMBER, TEXT_MUTED_DAWN, TEXT_MUTED_INK = '#EFE8DC', '#1C1A1F', '#E8B77A', '#5F5967', '#B3ABB5'

LOCALES = {'fr': 'fr-FR', 'en': 'en-US'}

# (file stem, background, caption fr, caption en, subcaption fr, subcaption en)
SHOTS = [
    ('01-home', 'dawn', 'Combien de nuits difficiles ?', 'How many difficult nights?',
     'La réponse, sans chercher.', 'The answer, without digging.'),
    ('02-entry', 'dawn', 'Votre nuit en 15 secondes', 'Your night in 15 seconds',
     'Directement sur la bande de nuit.', 'Right on the band of your night.'),
    ('03-weave', 'ink', 'Chaque nuit, une bande de lumière', 'Each night, a band of light',
     'Le mois se lit d’un coup d’œil.', 'The month at a glance.'),
    ('04-patterns', 'dawn', 'Ce qui accompagne vos nuits', 'What comes with your nights',
     'Des liens, jamais des jugements.', 'Links, never judgements.'),
    ('05-night', 'ink', 'Je n’arrive pas à dormir', 'I can’t sleep',
     'Pas d’heure. Une lueur qui respire.', 'No clock. A glow that breathes.'),
    ('06-privacy', 'ink', 'Tout reste sur votre téléphone', 'Everything stays on your phone',
     'Pas de compte, pas de réseau, pas de pub.', 'No account, no network, no ads.'),
]

SIZES = {
    'ios-6.9': (1320, 2868),
    'ios-6.5': (1284, 2778),
    'android': (1080, 2160),
}


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def background(size, mode):
    w, h = size
    base = Image.new('RGB', size, hex_rgb(PAPER if mode == 'dawn' else INK))
    # Warm glow, high and to the right (DESIGN §6).
    glow = Image.new('L', size, 0)
    d = ImageDraw.Draw(glow)
    r = int(w * 0.9)
    cx, cy = int(w * 0.72), int(-h * 0.02)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(w * 0.25))
    amber = Image.new('RGB', size, hex_rgb(AMBER))
    base = Image.composite(amber, base, glow.point(lambda v: int(v * (0.22 if mode == 'dawn' else 0.16))))
    # Grain.
    rnd = random.Random(7)
    noise = Image.frombytes('L', (w // 2, h // 2), bytes(rnd.randrange(256) for _ in range((w // 2) * (h // 2))))
    noise = noise.resize(size).filter(ImageFilter.GaussianBlur(0.6))
    grain = Image.merge('RGB', (noise, noise, noise))
    blend = ImageChops.multiply if mode == 'dawn' else ImageChops.screen
    return Image.blend(base, blend(base, grain), 0.06 if mode == 'dawn' else 0.05)


def rounded(img, radius):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius, fill=255)
    out = Image.new('RGBA', img.size)
    out.paste(img, (0, 0), mask)
    return out


def trim_system_bars(img):
    """Demo builds hide the status bar; crop the gesture bar and any leftover status area."""
    w, h = img.size
    top = int(h * 0.045)
    bottom = int(h * 0.025)
    return img.crop((0, top, w, h - bottom))


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ''
    for word in words:
        test = f'{cur} {word}'.strip()
        if draw.textlength(test, font=font) <= max_w:
            cur = test
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def frame(raw_path, size, mode, caption, sub):
    w, h = size
    canvas = background(size, mode).convert('RGBA')
    draw = ImageDraw.Draw(canvas)
    fg = hex_rgb(INK if mode == 'dawn' else PAPER)
    muted = hex_rgb(TEXT_MUTED_DAWN if mode == 'dawn' else TEXT_MUTED_INK)
    title_font = ImageFont.truetype(DISPLAY, int(w * 0.068))
    sub_font = ImageFont.truetype(BODY, int(w * 0.036))
    margin = int(w * 0.08)
    y = int(h * 0.06)
    for line in wrap(draw, caption, title_font, w - 2 * margin):
        draw.text((margin, y), line, font=title_font, fill=fg)
        y += int(title_font.size * 1.18)
    y += int(h * 0.006)
    draw.text((margin, y), sub, font=sub_font, fill=muted)
    y += int(sub_font.size * 1.9)

    shot = trim_system_bars(Image.open(raw_path).convert('RGB'))
    avail_h = h - y - int(h * 0.035)
    scale = min((w - 2 * margin * 0.7) / shot.width, avail_h / shot.height)
    shot = shot.resize((int(shot.width * scale), int(shot.height * scale)), Image.LANCZOS)
    radius = int(shot.width * 0.06)
    x = (w - shot.width) // 2
    # Hairline instead of a drop shadow (DESIGN §1).
    border = Image.new('RGBA', (shot.width + 4, shot.height + 4), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle(
        [0, 0, shot.width + 3, shot.height + 3], radius + 2,
        outline=hex_rgb('#D6CAB7' if mode == 'dawn' else '#3A343C'), width=3)
    canvas.alpha_composite(border, (x - 2, y - 2))
    canvas.alpha_composite(rounded(shot, radius), (x, y))
    return canvas.convert('RGB')


def main():
    if not os.path.isdir(RAW):
        raise SystemExit(f'No raw captures in {RAW}: run the Maestro capture flow first.')
    for lang in sorted(os.listdir(RAW)):
        locale = LOCALES.get(lang)
        if not locale:
            continue
        ios_dir = os.path.join(ROOT, 'fastlane', 'screenshots', 'ios', locale)
        play_dir = os.path.join(ROOT, 'fastlane', 'metadata', 'android', locale, 'images', 'phoneScreenshots')
        os.makedirs(ios_dir, exist_ok=True)
        os.makedirs(play_dir, exist_ok=True)
        for i, (stem, mode, cfr, cen, sfr, sen) in enumerate(SHOTS, start=1):
            raw = os.path.join(RAW, lang, f'{stem}.png')
            if not os.path.exists(raw):
                print('missing', raw)
                continue
            caption, sub = (cfr, sfr) if lang == 'fr' else (cen, sen)
            frame(raw, SIZES['ios-6.9'], mode, caption, sub).save(os.path.join(ios_dir, f'{stem}_6.9.png'))
            frame(raw, SIZES['ios-6.5'], mode, caption, sub).save(os.path.join(ios_dir, f'{stem}_6.5.png'))
            frame(raw, SIZES['android'], mode, caption, sub).save(os.path.join(play_dir, f'{i:02d}.png'))
            print('framed', lang, stem)


if __name__ == '__main__':
    main()
