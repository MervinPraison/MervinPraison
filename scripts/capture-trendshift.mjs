import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const DEVELOPER_URL = 'https://trendshift.io/developers/9425';
const CHARTS = [
  { label: 'all language ranking', output: 'generated/trendshift-all-language.png' },
  { label: 'python ranking', output: 'generated/trendshift-python.png' },
];

await mkdir('generated', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(DEVELOPER_URL, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'GitHub trending history' }).waitFor();

const section = page
  .locator('section')
  .filter({ has: page.getByRole('heading', { name: 'GitHub trending history' }) });

for (const chart of CHARTS) {
  const card = section.locator('div.bg-card').filter({ hasText: chart.label });
  await card.screenshot({ path: chart.output });
  console.log(`Saved ${chart.output}`);
}

await browser.close();
