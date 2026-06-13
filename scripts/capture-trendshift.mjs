import { mkdir, writeFile } from 'fs/promises';

const DEVELOPER_URL = 'https://trendshift.io/developers/9425';
const CHARTS = [
  { key: 'all-language', title: 'All Language Ranking', language: null },
  { key: 'python', title: 'Python Ranking', language: 'python' },
];

const WIDTH = 1100;
const HEIGHT = 340;
const PADDING = { top: 52, right: 28, bottom: 64, left: 52 };
const MAX_RANK = 25;
const LABEL_COUNT = 8;

const THEMES = {
  light: {
    bg: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    muted: '#6b7280',
    line: '#4f46e5',
    grid: '#e5e7eb',
  },
  dark: {
    bg: '#161b22',
    border: '#30363d',
    text: '#e6edf3',
    muted: '#8b949e',
    line: '#818cf8',
    grid: '#30363d',
  },
};

function extractTrendings(html) {
  const trendings = [];
  const pattern =
    /trending_language\\":(null|\\"[^\\"]*\\"),\\"trend_date\\":\\"([^\\"]+)\\",\\"rank\\":(\d+)/g;

  for (const match of html.matchAll(pattern)) {
    trendings.push({
      language: match[1] === 'null' ? null : match[1].slice(2, -2),
      date: match[2].slice(0, 10),
      rank: Number(match[3]),
    });
  }

  if (!trendings.length) {
    throw new Error('No Trendshift ranking data found in page HTML');
  }

  return trendings;
}

function buildSvg(title, points, themeName) {
  const theme = THEMES[themeName];
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const lastIndex = Math.max(points.length - 1, 1);

  const xAt = (index) => PADDING.left + (index / lastIndex) * plotWidth;
  const yAt = (rank) => PADDING.top + (rank / MAX_RANK) * plotHeight;

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${xAt(index).toFixed(1)},${yAt(point.rank).toFixed(1)}`)
    .join(' ');

  const labelIndexes = Array.from({ length: LABEL_COUNT }, (_, index) =>
    Math.round((index * lastIndex) / (LABEL_COUNT - 1)),
  );

  const gridLines = [5, 10, 15, 20, 25]
    .map(
      (rank) =>
        `<line x1="${PADDING.left}" y1="${yAt(rank)}" x2="${WIDTH - PADDING.right}" y2="${yAt(rank)}" stroke="${theme.grid}" stroke-dasharray="5 5" stroke-width="1"/>`,
    )
    .join('');

  const yLabels = [0, 5, 10, 15, 20, 25]
    .map(
      (rank) =>
        `<text x="${PADDING.left - 10}" y="${yAt(rank) + 4}" fill="${theme.muted}" font-size="12" text-anchor="end" font-family="system-ui,-apple-system,sans-serif">${rank}</text>`,
    )
    .join('');

  const markers = points
    .map(
      (point, index) =>
        `<circle cx="${xAt(index).toFixed(1)}" cy="${yAt(point.rank).toFixed(1)}" r="4.5" fill="${theme.bg}" stroke="${theme.line}" stroke-width="3"/>`,
    )
    .join('');

  const xLabels = labelIndexes
    .map(
      (index) =>
        `<text x="${xAt(index).toFixed(1)}" y="${HEIGHT - 18}" fill="${theme.muted}" font-size="12" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif">${points[index].date}</text>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" role="img" aria-label="${title}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${theme.bg}" stroke="${theme.border}" rx="10"/>
  <text x="20" y="30" fill="${theme.text}" font-size="18" font-weight="700" font-family="system-ui,-apple-system,sans-serif">${title}</text>
  ${gridLines}
  ${yLabels}
  <path d="${linePath}" fill="none" stroke="${theme.line}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${markers}
  ${xLabels}
</svg>`;
}

await mkdir('generated', { recursive: true });

const html = await fetch(DEVELOPER_URL).then((response) => response.text());
const trendings = extractTrendings(html);

for (const chart of CHARTS) {
  const points = trendings.filter((entry) => entry.language === chart.language);
  if (!points.length) {
    throw new Error(`No ranking points found for ${chart.title}`);
  }

  for (const themeName of Object.keys(THEMES)) {
    const suffix = themeName === 'dark' ? '-dark' : '';
    const output = `generated/trendshift-${chart.key}${suffix}.svg`;
    await writeFile(output, buildSvg(chart.title, points, themeName));
    console.log(`Saved ${output} (${points.length} points)`);
  }
}
