import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const DEVELOPER_URL = 'https://trendshift.io/developers/9425';
const CHARTS = [
  { label: 'all language ranking', name: 'trendshift-all-language' },
  { label: 'python ranking', name: 'trendshift-python' },
];

await mkdir('generated', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

await page.goto(DEVELOPER_URL, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'GitHub trending history' }).waitFor();

await page.addStyleTag({
  content: `
    section .grid { display: block !important; }
    section .bg-card {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 0 1rem !important;
    }
  `,
});

const section = page
  .locator('section')
  .filter({ has: page.getByRole('heading', { name: 'GitHub trending history' }) });

for (const chart of CHARTS) {
  const card = section.locator('div.bg-card').filter({ hasText: chart.label });
  await card.screenshot({ path: `generated/${chart.name}.png` });
  console.log(`Saved generated/${chart.name}.png`);
}

await page.addStyleTag({
  content: `
    html, body { background: #0d1117 !important; }
    section .bg-card {
      background: #161b22 !important;
      border-color: #30363d !important;
    }
    section .bg-card .absolute {
      color: #e6edf3 !important;
    }
    section .bg-card > div:not(.absolute) {
      filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.95);
    }
  `,
});

for (const chart of CHARTS) {
  const card = section.locator('div.bg-card').filter({ hasText: chart.label });
  await card.screenshot({ path: `generated/${chart.name}-dark.png` });
  console.log(`Saved generated/${chart.name}-dark.png`);
}

await browser.close();
