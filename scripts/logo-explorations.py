#!/usr/bin/env python3
"""
Logo explorations for Lueur: renders each concept as an app icon (dark and
light), at several sizes, on a single comparison board.

  python3 scripts/logo-explorations.py
  → assets/brand/explorations/<concept>.svg, board.png
Needs rsvg-convert and Pillow.
"""
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'brand', 'explorations')
FONTS = os.path.join(ROOT, 'assets', 'fonts')

INK, WARM, PAPER, CLAY, CLAY_DEEP, AMBER, SAGE = (
    '#1C1A1F', '#29252B', '#EFE8DC', '#C98B6B', '#B37656', '#E8B77A', '#9AAA98')


def bg(dark):
    if dark:
        return f'''<defs><radialGradient id="bg" cx="55" cy="45" r="80" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="{WARM}"/><stop offset="1" stop-color="{INK}"/></radialGradient></defs>
<rect width="100" height="100" fill="url(#bg)"/>'''
    return f'<rect width="100" height="100" fill="{PAPER}"/>'


def halo(cx, cy, r, opacity, hid='h'):
    return f'''<defs><radialGradient id="{hid}" cx="{cx}" cy="{cy}" r="{r}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="{AMBER}" stop-opacity="{opacity}"/>
<stop offset="0.45" stop-color="{AMBER}" stop-opacity="{opacity * 0.3:.3f}"/>
<stop offset="1" stop-color="{AMBER}" stop-opacity="0"/></radialGradient></defs>
<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#{hid})"/>'''


def concept_wick(dark):
    """A slender wick (the « l » of lueur) crowned by a soft flame of light."""
    fg = PAPER if dark else INK
    flame = AMBER if dark else CLAY_DEEP
    return bg(dark) + halo(50, 33, 30, 0.8 if dark else 0.55) + f'''
<rect x="46.5" y="44" width="7" height="38" rx="3.5" fill="{fg}" opacity="0.92"/>
<path d="M50 20 C56 28 58 33 58 37 A8 8 0 0 1 42 37 C42 33 44 28 50 20 Z" fill="{flame}"/>'''


def concept_nightlight(dark):
    """A small dome night-light: the glowing dome sits on a quiet base."""
    base = '#3A343C' if dark else '#D6CAB7'
    dome = AMBER if dark else CLAY
    return bg(dark) + halo(50, 50, 36, 0.8 if dark else 0.55) + f'''
<path d="M30 60 A20 20 0 0 1 70 60 Z" fill="{dome}"/>
<rect x="27" y="61" width="46" height="9" rx="4.5" fill="{base}"/>'''


def concept_band(dark):
    """The signature: one night as a band of light, with a single darker awakening."""
    notch = INK if dark else '#B9AC99'
    return bg(dark) + f'''
<defs>
<linearGradient id="band" x1="18" y1="0" x2="82" y2="0" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="{CLAY_DEEP}"/><stop offset="0.45" stop-color="{AMBER}"/>
<stop offset="0.7" stop-color="{AMBER}"/><stop offset="1" stop-color="{CLAY_DEEP}"/></linearGradient>
<filter id="blur" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="6"/></filter>
<clipPath id="clip"><rect x="18" y="42" width="64" height="16" rx="8"/></clipPath>
</defs>
<rect x="24" y="44" width="52" height="12" rx="6" fill="{AMBER}" opacity="{0.55 if dark else 0.35}" filter="url(#blur)"/>
<g clip-path="url(#clip)">
<rect x="18" y="42" width="64" height="16" fill="url(#band)"/>
<rect x="18" y="42" width="9" height="16" fill="{PAPER if dark else INK}" opacity="0.18"/>
<rect x="58" y="42" width="3.5" height="16" fill="{notch}" opacity="0.9"/>
</g>'''


def concept_door(dark):
    """A door left ajar: a blade of warm light widening onto the floor."""
    leaf = WARM if dark else '#D9CFBF'
    return bg(dark) + f'''
<defs>
<linearGradient id="blade" x1="0" y1="18" x2="0" y2="80" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="{AMBER}" stop-opacity="0.55"/><stop offset="1" stop-color="{AMBER}"/></linearGradient>
<radialGradient id="pool" cx="58" cy="82" r="30" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="{AMBER}" stop-opacity="{0.55 if dark else 0.4}"/>
<stop offset="1" stop-color="{AMBER}" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="60" cy="82" rx="30" ry="8" fill="url(#pool)"/>
<rect x="30" y="18" width="24" height="62" rx="1.5" fill="{leaf}"/>
<path d="M54 18 L60 18 L68 80 L54 80 Z" fill="url(#blade)"/>'''


def concept_horizon(dark):
    """Current mark, for reference."""
    fg = PAPER if dark else INK
    light = AMBER if dark else CLAY_DEEP
    return bg(dark) + halo(60, 51, 30, 0.75 if dark else 0.6) + f'''
<line x1="14" y1="62" x2="86" y2="62" stroke="{fg}" stroke-opacity="0.9" stroke-width="3.2" stroke-linecap="round"/>
<circle cx="60" cy="51" r="6.5" fill="{light}"/>'''


CONCEPTS = [
    ('A-meche', 'A · La mèche', 'Le « l » de lueur, coiffé d’une flamme douce.', concept_wick),
    ('B-veilleuse', 'B · La veilleuse', 'Un petit dôme lumineux sur son socle.', concept_nightlight),
    ('C-bande', 'C · La bande', 'Une nuit en bande de lumière, un réveil.', concept_band),
    ('D-porte', 'D · La porte', 'Une porte entrouverte, une lame de lumière.', concept_door),
    ('actuel', 'Actuel', 'Horizon et point de lumière (référence).', concept_horizon),
]


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">{body}</svg>\n'


def fontconfig_env():
    conf = os.path.join(OUT, '.fonts.conf')
    with open(conf, 'w') as f:
        f.write(f'''<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>
<include ignore_missing="yes">/etc/fonts/fonts.conf</include><dir>{FONTS}</dir>
<cachedir>{os.path.join(OUT, '.fontcache')}</cachedir></fontconfig>''')
    return {**os.environ, 'FONTCONFIG_FILE': conf}


def render(path, size, env):
    png = path.replace('.svg', f'-{size}.png')
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), '-o', png, path], check=True, env=env)
    return Image.open(png).convert('RGBA')


def masked(img):
    """iOS-like rounded mask (≈22.4 % radius)."""
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], int(img.size[0] * 0.224), fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    env = fontconfig_env()
    col_w, pad, top = 360, 40, 90
    board = Image.new('RGB', (pad * 2 + col_w * len(CONCEPTS), 710), PAPER)
    d = ImageDraw.Draw(board)
    title = ImageFont.truetype(os.path.join(FONTS, 'YoungSerif-Regular.ttf'), 30)
    label = ImageFont.truetype(os.path.join(FONTS, 'YsabeauOffice-SemiBold.ttf'), 22)
    small = ImageFont.truetype(os.path.join(FONTS, 'YsabeauOffice-Regular.ttf'), 17)
    d.text((pad, 28), 'Lueur — pistes de logo', font=title, fill=INK)
    for i, (key, name, desc, fn) in enumerate(CONCEPTS):
        x = pad + i * col_w
        paths = {}
        for mode, dark in (('dark', True), ('light', False)):
            p = os.path.join(OUT, f'{key}-{mode}.svg')
            with open(p, 'w') as f:
                f.write(svg(fn(dark)))
            paths[mode] = p
        big = masked(render(paths['dark'], 240, env))
        board.paste(big, (x, top), big)
        y = top + 250
        for size in (120, 60, 29):
            icon = masked(render(paths['dark'], size, env))
            board.paste(icon, (x + {120: 0, 60: 130, 29: 200}[size], y), icon)
        light = masked(render(paths['light'], 120, env))
        board.paste(light, (x, y + 135), light)
        d.text((x, y + 275), name, font=label, fill=INK)
        d.text((x, y + 305), desc, font=small, fill='#5F5967')
    board.save(os.path.join(OUT, 'board.png'))
    for f in os.listdir(OUT):
        if f.endswith('.png') and f != 'board.png':
            os.remove(os.path.join(OUT, f))
    print('Board:', os.path.join(OUT, 'board.png'))


if __name__ == '__main__':
    main()
