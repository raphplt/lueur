import type { TFunction } from 'i18next';

import { draftClock, nightToDraft } from '@/domain/draft';
import {
  formatClock,
  formatClockFromNoon,
  formatDateKey,
  formatDuration,
  formatHourShort,
  formatPercent,
  type AppLocale,
} from '@/domain/format';
import { nightMetrics, summarize } from '@/domain/metrics';
import { dateRange } from '@/domain/time';
import type { DateKey, Night } from '@/domain/types';
import { bandGeometry, bandInputFromNight, WEAVE_AXIS } from '@/features/band/geometry';

/** Print palette: paper-white page, ink text, clay band (legible in greyscale too). */
const P = {
  ink: '#1C1A1F',
  muted: '#5F5967',
  line: '#D6CAB7',
  sunken: '#F3EEE6',
  clay: '#B37656',
  amber: '#E8B77A',
  wake: '#FFFFFF',
};

export interface PdfInput {
  nights: Night[];
  from: DateKey;
  to: DateKey;
  tagLabel: (tagId: string) => string;
  t: TFunction;
  locale: AppLocale;
  hour12: boolean;
  generatedAt: Date;
  /** Base64 TTF data for embedded fonts, when available. */
  fonts?: { display?: string; body?: string };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BAND_W = 150;
const BAND_H = 10;

/** Inline SVG night band on the 18:00 → 14:00 axis. */
export function bandSvg(n: Night): string {
  const g = bandGeometry(bandInputFromNight(n), WEAVE_AXIS, BAND_W);
  const midnight = (6 / 20) * BAND_W;
  const rects = g.segments
    .map((s) => {
      const w = (s.x1 - s.x0).toFixed(2);
      const x = s.x0.toFixed(2);
      if (s.kind === 'sleep')
        return `<rect x="${x}" y="2" width="${w}" height="${BAND_H}" fill="${P.clay}"/>`;
      if (s.kind === 'wake')
        return `<rect x="${x}" y="2" width="${w}" height="${BAND_H}" fill="${P.wake}"/>`;
      return `<rect x="${x}" y="2" width="${w}" height="${BAND_H}" fill="${P.clay}" fill-opacity="0.35"/>`;
    })
    .join('');
  return `<svg width="${BAND_W}" height="${BAND_H + 4}" viewBox="0 0 ${BAND_W} ${BAND_H + 4}" xmlns="http://www.w3.org/2000/svg">
<line x1="${midnight}" y1="0" x2="${midnight}" y2="${BAND_H + 4}" stroke="${P.line}" stroke-width="0.8"/>
<clipPath id="c${n.wakeDate}"><rect x="${g.x0.toFixed(2)}" y="2" width="${(g.x1 - g.x0).toFixed(2)}" height="${BAND_H}" rx="${BAND_H / 2}"/></clipPath>
<g clip-path="url(#c${n.wakeDate})">${rects}</g></svg>`;
}

export function buildPdfHtml(input: PdfInput): string {
  const { t, locale, hour12 } = input;
  const byDate = new Map(input.nights.map((n) => [n.wakeDate, n]));
  const dates = dateRange(input.from, input.to);
  const inRange = input.nights.filter((n) => n.wakeDate >= input.from && n.wakeDate <= input.to);
  const s = summarize(inRange);
  const d = (v: number | null) => (v === null ? '—' : formatDuration(v, locale));
  const clock = (min: number) => formatClock(draftClock(min), hour12);
  const col = t('pdf.columns', { returnObjects: true }) as Record<string, string>;

  const rows = dates
    .map((date) => {
      const label = escapeHtml(formatDateKey(date, 'EEE d/MM', locale));
      const n = byDate.get(date);
      if (!n) {
        return `<tr class="missing"><td>${label}</td><td colspan="12">${escapeHtml(t('pdf.notLogged'))}</td></tr>`;
      }
      const m = nightMetrics(n);
      const dr = nightToDraft(n);
      const tags = n.tagIds.map((id) => escapeHtml(input.tagLabel(id))).join(', ');
      return `<tr${m.isDifficult ? ' class="difficult"' : ''}>
<td>${label}${m.isDifficult ? ' •' : ''}</td>
<td class="band">${bandSvg(n)}</td>
<td>${clock(dr.bedMin)}</td>
<td>${n.sleepLatencyMin}&nbsp;min</td>
<td>${escapeHtml(t('pdf.awakeningsCell', { count: m.awakeningCount, duration: formatDuration(m.wasoMin, locale) }))}</td>
<td>${clock(dr.finalWakeMin)}</td>
<td>${clock(dr.outOfBedMin)}</td>
<td>${d(m.timeInBedMin)}</td>
<td><strong>${d(m.totalSleepMin)}</strong></td>
<td>${formatPercent(m.efficiency, locale)}</td>
<td>${n.quality}/5</td>
<td>${tags}</td>
<td class="note">${n.note ? escapeHtml(n.note) : ''}</td>
</tr>`;
    })
    .join('\n');

  const summaryItems: [string, string][] = [
    [t('pdf.logged'), `${s.nights} / ${dates.length}`],
    [
      t('reports.frequency.title'),
      t('reports.frequency.value', { difficult: s.difficult, logged: s.nights }),
    ],
    [t('reports.stats.sleep'), d(s.totalSleepMin)],
    [t('reports.stats.inBed'), d(s.timeInBedMin)],
    [
      t('reports.stats.efficiency'),
      s.efficiency === null ? '—' : formatPercent(s.efficiency, locale),
    ],
    [t('reports.stats.latency'), d(s.latencyMin)],
    [t('reports.stats.waso'), d(s.wasoMin)],
    [
      t('reports.stats.bedtime'),
      s.bedClock === null
        ? '—'
        : `${formatClockFromNoon(s.bedClock, hour12)}${s.bedtimeSpreadMin !== null ? ` ± ${formatDuration(s.bedtimeSpreadMin, locale)}` : ''}`,
    ],
    [
      t('reports.stats.rise'),
      s.outOfBedClock === null
        ? '—'
        : `${formatClockFromNoon(s.outOfBedClock, hour12)}${s.riseSpreadMin !== null ? ` ± ${formatDuration(s.riseSpreadMin, locale)}` : ''}`,
    ],
  ];

  const face = (name: string, data?: string) =>
    data
      ? `@font-face { font-family: '${name}'; src: url(data:font/ttf;base64,${data}) format('truetype'); }`
      : '';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t('pdf.title'))}</title>
<style>
${face('LueurDisplay', input.fonts?.display)}
${face('LueurBody', input.fonts?.body)}
@page { size: A4 landscape; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { font-family: LueurBody, 'Helvetica Neue', Arial, sans-serif; color: ${P.ink}; font-size: 9.5pt; margin: 0; }
h1 { font-family: LueurDisplay, Georgia, serif; font-weight: normal; font-size: 22pt; margin: 0; }
h2 { font-family: LueurDisplay, Georgia, serif; font-weight: normal; font-size: 12pt; margin: 14pt 0 6pt; }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid ${P.line}; padding-bottom: 6pt; }
.muted { color: ${P.muted}; }
.summary { display: flex; flex-wrap: wrap; gap: 4pt 18pt; }
.summary div { min-width: 120pt; }
.summary b { display: block; font-size: 11pt; }
table { width: 100%; border-collapse: collapse; margin-top: 4pt; }
th { text-align: left; font-weight: 600; color: ${P.muted}; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.4pt; border-bottom: 1px solid ${P.line}; padding: 3pt 4pt; }
td { padding: 3pt 4pt; border-bottom: 0.5px solid ${P.line}; vertical-align: middle; white-space: nowrap; }
td.note { white-space: normal; max-width: 150pt; color: ${P.muted}; }
td.band { padding: 1pt 4pt; }
tr.missing td { color: ${P.muted}; font-style: italic; }
tr.difficult td:first-child { font-weight: 600; }
tr:nth-child(even) td { background: ${P.sunken}; }
.foot { margin-top: 10pt; font-size: 8pt; color: ${P.muted}; line-height: 1.4; }
.dot { display: inline-block; width: 7pt; height: 7pt; border-radius: 4pt; background: ${P.clay}; vertical-align: middle; }
</style>
</head>
<body>
<div class="head">
  <div>
    <h1>${escapeHtml(t('pdf.title'))}</h1>
    <div class="muted">${escapeHtml(t('pdf.period', { from: formatDateKey(input.from, 'd MMMM yyyy', locale), to: formatDateKey(input.to, 'd MMMM yyyy', locale) }))}</div>
  </div>
  <div class="muted" style="text-align:right">lueur <span class="dot"></span></div>
</div>
<h2>${escapeHtml(t('pdf.summary'))}</h2>
<div class="summary">
${summaryItems.map(([k, v]) => `<div><span class="muted">${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`).join('\n')}
</div>
<table>
<thead><tr>
<th>${escapeHtml(col.night ?? '')}</th><th>${escapeHtml(`${formatHourShort(-360, hour12, locale)} → ${formatHourShort(840, hour12, locale)}`)}</th><th>${escapeHtml(col.bed ?? '')}</th><th>${escapeHtml(col.latency ?? '')}</th>
<th>${escapeHtml(col.awakenings ?? '')}</th><th>${escapeHtml(col.wake ?? '')}</th><th>${escapeHtml(col.out ?? '')}</th>
<th>${escapeHtml(col.inBed ?? '')}</th><th>${escapeHtml(col.sleep ?? '')}</th><th>${escapeHtml(col.efficiency ?? '')}</th>
<th>${escapeHtml(col.quality ?? '')}</th><th>${escapeHtml(col.tags ?? '')}</th><th>${escapeHtml(col.note ?? '')}</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>
<div class="foot">
${escapeHtml(t('pdf.legend'))}<br/>
• ${escapeHtml(t('pdf.difficultNote'))} ${escapeHtml(t('pdf.qualityScale'))}<br/>
${escapeHtml(t('pdf.disclaimer'))}<br/>
${escapeHtml(t('pdf.generated', { date: formatDateKey(generatedKey(input.generatedAt), 'd MMMM yyyy', locale) }))}
</div>
</body>
</html>`;
}

function generatedKey(d: Date): DateKey {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
