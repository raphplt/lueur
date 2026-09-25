#!/usr/bin/env python3
"""
Generates Lueur brand sources (SVG) and rasterised assets (PNG).

Geometry follows src/brand/logo.tsx (MARK, viewBox 0 0 100 100):
a horizon line and a warm point of light resting above it, in its halo.

Usage: python3 scripts/brand.py   (needs rsvg-convert and ImageMagick `magick`)
"""
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, 'assets', 'brand')
OUT = os.path.join(BRAND, 'generated')

INK = '#1C1A1F'
INK_DEEP = '#0F0E11'
WARM_NIGHT = '#29252B'
PAPER = '#EFE8DC'
CLAY_DEEP = '#B37656'
AMBER = '#E8B77A'

MARK = dict(horizon_y=62, x0=14, x1=86, stroke=3.2, light_x=60, light_y=51, light_r=6.5, halo_r=30)


def mark(scale=1.0, cx=50, cy=50, line=PAPER, line_opacity=0.9, light=AMBER, halo=AMBER,
         halo_opacity=0.75, halo_id='halo'):
    """Mark group, scaled around (cx, cy) inside a 100×100 box."""
    m = MARK
    t = f'translate({cx - 50 * scale} {cy - 50 * scale}) scale({scale})'
    return f'''
  <defs>
    <radialGradient id="{halo_id}" cx="{m['light_x']}" cy="{m['light_y']}" r="{m['halo_r']}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="{halo}" stop-opacity="{halo_opacity}"/>
      <stop offset="0.4" stop-color="{halo}" stop-opacity="{halo_opacity * 0.3:.3f}"/>
      <stop offset="1" stop-color="{halo}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g transform="{t}">
    <circle cx="{m['light_x']}" cy="{m['light_y']}" r="{m['halo_r']}" fill="url(#{halo_id})"/>
    <line x1="{m['x0']}" y1="{m['horizon_y']}" x2="{m['x1']}" y2="{m['horizon_y']}" stroke="{line}"
          stroke-opacity="{line_opacity}" stroke-width="{m['stroke']}" stroke-linecap="round"/>
    <circle cx="{m['light_x']}" cy="{m['light_y']}" r="{m['light_r']}" fill="{light}"/>
  </g>'''


def grain(opacity, blend='screen', fid='grain'):
    return f'''
  <filter id="{fid}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="100" height="100" filter="url(#{fid})" opacity="{opacity}" style="mix-blend-mode:{blend}"/>'''


def background(color, vignette_from, grain_opacity, blend='screen'):
    return f'''
  <defs>
    <radialGradient id="bgv" cx="58" cy="48" r="75" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="{vignette_from}"/>
      <stop offset="1" stop-color="{color}"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#bgv)"/>{grain(grain_opacity, blend)}'''


def svg(body, bg=None):
    rect = f'<rect width="100" height="100" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">{rect}{body}\n</svg>\n'


SOURCES = {
    # Mark on transparent background, for dark and light surfaces.
    'mark-on-dark.svg': svg(mark()),
    'mark-on-light.svg': svg(mark(line=INK, line_opacity=0.88, light=CLAY_DEEP, halo=AMBER, halo_opacity=0.6)),
    # iOS app icons (1024, square: iOS applies the mask). Mark at 88 % so the halo breathes.
    'icon-ios.svg': svg(background(INK, WARM_NIGHT, 0.08) + mark(scale=0.88, cy=47)),
    'icon-ios-dark.svg': svg(background(INK_DEEP, INK, 0.06) + mark(scale=0.88, cy=47, halo_opacity=0.6)),
    'icon-ios-tinted.svg': svg(
        mark(scale=0.88, cy=47, line='#FFFFFF', line_opacity=0.85, light='#FFFFFF', halo='#FFFFFF', halo_opacity=0.35),
        bg='#000000'),
    # Android adaptive icon: 108 dp canvas, content inside the 66 dp safe circle.
    'android-foreground.svg': svg(mark(scale=0.62, cy=48)),
    'android-background.svg': svg(background(INK, WARM_NIGHT, 0.08)),
    'android-monochrome.svg': svg(
        mark(scale=0.62, cy=48, line='#FFFFFF', line_opacity=1, light='#FFFFFF', halo='#FFFFFF', halo_opacity=0)),
    # Notification small icon: white silhouette, no halo.
    'notification.svg': svg(
        mark(scale=1.15, cy=44, line='#FFFFFF', line_opacity=1, light='#FFFFFF', halo='#FFFFFF', halo_opacity=0)),
    # Store / README artwork.
    'feature-graphic.svg': None,
}


def feature_graphic():
    """1024×500 Google Play feature graphic: horizon across, light and wordmark."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
  <defs>
    <radialGradient id="bg" cx="620" cy="220" r="700" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="{WARM_NIGHT}"/><stop offset="1" stop-color="{INK}"/>
    </radialGradient>
    <radialGradient id="h" cx="640" cy="262" r="260" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="{AMBER}" stop-opacity="0.7"/>
      <stop offset="0.4" stop-color="{AMBER}" stop-opacity="0.2"/>
      <stop offset="1" stop-color="{AMBER}" stop-opacity="0"/>
    </radialGradient>
    <filter id="g" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" filter="url(#g)" opacity="0.07" style="mix-blend-mode:screen"/>
  <circle cx="640" cy="262" r="260" fill="url(#h)"/>
  <line x1="96" y1="310" x2="928" y2="310" stroke="{PAPER}" stroke-opacity="0.85" stroke-width="5" stroke-linecap="round"/>
  <circle cx="640" cy="262" r="30" fill="{AMBER}"/>
  <text x="96" y="236" font-family="Young Serif" font-size="96" fill="{PAPER}">lueur</text>
</svg>
'''


def fontconfig_env():
    """Private fontconfig so rsvg finds the bundled fonts without installing them."""
    conf = os.path.join(OUT, '.fonts.conf')
    with open(conf, 'w') as f:
        f.write(f'''<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <dir>{os.path.join(ROOT, 'assets', 'fonts')}</dir>
  <cachedir>{os.path.join(OUT, '.fontcache')}</cachedir>
</fontconfig>''')
    return {**os.environ, 'FONTCONFIG_FILE': conf}


ENV = None


def render(src, dst, w, h=None):
    global ENV
    ENV = ENV or fontconfig_env()
    h = h or w
    subprocess.run(['rsvg-convert', '-w', str(w), '-h', str(h), '-o', dst, src], check=True, env=ENV)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, content in SOURCES.items():
        if name == 'feature-graphic.svg':
            content = feature_graphic()
        with open(os.path.join(BRAND, name), 'w') as f:
            f.write(content)
    b = lambda n: os.path.join(BRAND, n)
    o = lambda n: os.path.join(OUT, n)

    # iOS: 1024 masters (Xcode derives the other sizes) + every legacy size for reference.
    render(b('icon-ios.svg'), o('icon-ios.png'), 1024)
    render(b('icon-ios-dark.svg'), o('icon-ios-dark.png'), 1024)
    render(b('icon-ios-tinted.svg'), o('icon-ios-tinted.png'), 1024)
    os.makedirs(o('ios'), exist_ok=True)
    for size in [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024]:
        render(b('icon-ios.svg'), o(f'ios/icon-{size}.png'), size)
    # Flatten (App Store rejects alpha in the marketing icon).
    for n in ['icon-ios.png', 'icon-ios-dark.png', 'icon-ios-tinted.png', 'ios/icon-1024.png']:
        subprocess.run(['magick', o(n), '-background', INK, '-alpha', 'remove', '-alpha', 'off', o(n)], check=True)

    # Android adaptive layers (432 px = 108 dp @ xxxhdpi) and legacy/Play icon (512).
    render(b('android-foreground.svg'), o('android-foreground.png'), 432)
    render(b('android-background.svg'), o('android-background.png'), 432)
    render(b('android-monochrome.svg'), o('android-monochrome.png'), 432)
    render(b('icon-ios.svg'), o('play-icon-512.png'), 512)
    subprocess.run(['magick', o('play-icon-512.png'), '-alpha', 'off', o('play-icon-512.png')], check=True)
    render(b('notification.svg'), o('notification-icon.png'), 96)

    # Splash: mark only, background colour set in app config.
    render(b('mark-on-dark.svg'), o('splash-dark.png'), 400)
    render(b('mark-on-light.svg'), o('splash-light.png'), 400)

    render(b('feature-graphic.svg'), o('feature-graphic.png'), 1024, 500)
    subprocess.run(['magick', o('feature-graphic.png'), '-alpha', 'off', o('feature-graphic.png')], check=True)
    print('Brand assets written to', OUT)


if __name__ == '__main__':
    main()
