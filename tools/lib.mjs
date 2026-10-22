// Fælles opstart for verifikationsværktøjerne: starter Chromium (swiftshader) og åbner guiden.
// Brug: const { page, close } = await openGuide({ url, width, height })
import { existsSync } from 'node:fs';

const PW = process.env.PLAYWRIGHT_MODULE || (existsSync('/opt/node22/lib/node_modules/playwright/index.mjs') ? '/opt/node22/lib/node_modules/playwright/index.mjs' : 'playwright');
const { chromium } = await import(PW);

export const BASE = process.env.GUIDE_URL || 'http://localhost:8123/korup/';

export async function openGuide({ url = BASE, width = 1280, height = 800 } = {}) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url);
  await page.waitForFunction(() => window.guide && window.guide.obbs, null, { timeout: 90000 });
  return { page, errors, close: () => browser.close() };
}

export function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
}
