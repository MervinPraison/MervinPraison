import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const DEVELOPER_URL = 'https://trendshift.io/developers/9425';
const CHARTS = [
  { label: 'all language ranking', name: 'trendshift-all-language' },
  { label: 'python ranking', name: 'trendshift-python' },
];

await mkdir('generated', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 900, height: 900 },
  deviceScaleFactor: 2,
});

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
    section .bg-card > div:not(.absolute) {
      height: 360px !important;
    }
  `,
});

await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await page.waitForTimeout(2000);

await page.evaluate(() => {
  const isBackground = (r, g, b, a) => a < 20 || (r > 235 && g > 235 && b > 235);

  for (const canvas of document.querySelectorAll('section canvas')) {
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    const { width, height } = canvas;
    const output = new Uint8ClampedArray(ctx.getImageData(0, 0, width, height).data);

    for (let pass = 0; pass < 3; pass += 1) {
      const current = new Uint8ClampedArray(output);

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          if (isBackground(current[i], current[i + 1], current[i + 2], current[i + 3])) continue;

          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

            const ni = (ny * width + nx) * 4;
            output[ni] = current[i];
            output[ni + 1] = current[i + 1];
            output[ni + 2] = current[i + 2];
            output[ni + 3] = Math.max(output[ni + 3], current[i + 3]);
          }
        }
      }
    }

    ctx.putImageData(new ImageData(output, width, height), 0, 0);
  }
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
      filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.1);
    }
  `,
});

for (const chart of CHARTS) {
  const card = section.locator('div.bg-card').filter({ hasText: chart.label });
  await card.screenshot({ path: `generated/${chart.name}-dark.png` });
  console.log(`Saved generated/${chart.name}-dark.png`);
}

await browser.close();
