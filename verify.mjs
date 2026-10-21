import { chromium } from 'playwright';
const out = process.argv[2], url = process.argv[3];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
await pg.goto(url); await pg.waitForFunction(() => window.guide, null, { timeout: 30000 });
console.log('info', JSON.stringify(await pg.evaluate(() => window.guide.info)));
const n = await pg.evaluate(() => window.guide.steps);
let fails = 0;
for (let i = 0; i < n; i++) for (const p of (i === 0 || i === 4 ? [1] : [0, 0.5, 1])) {
  const r = await pg.evaluate(([i, p]) => window.guide.set(i, p), [i, p]);
  for (const c of r) { if (!c.pass) fails++; console.log(`step ${i} p=${p} ${c.pass ? 'OK ' : 'FAIL'} ${c.name}: ${c.val}`); }
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: `${out}/trin${i}_p${Math.round(p * 100)}.png` });
}
// extra views of final: side (manual p.2 side view), front, with dims
await pg.evaluate(() => window.guide.set(4, 1));
await pg.evaluate(() => window.guide.view([2000, 290, 0], [0, 290, 0])); await pg.waitForTimeout(100); await pg.screenshot({ path: `${out}/final_side.png` });
await pg.evaluate(() => window.guide.view([0, 290, 2000], [0, 290, 0])); await pg.waitForTimeout(100); await pg.screenshot({ path: `${out}/final_front.png` });
await pg.evaluate(() => { window.guide.dims(true); window.guide.view([1100, 800, 1300], [0, 280, 0]); }); await pg.waitForTimeout(100); await pg.screenshot({ path: `${out}/final_maal.png` });
await pg.evaluate(() => { window.guide.dims(false); window.guide.set(0, 1); window.guide.view([0, 1600, 10], [0, 0, 0]); }); await pg.waitForTimeout(100); await pg.screenshot({ path: `${out}/trin0_top.png` });
await pg.evaluate(() => { window.guide.set(4, 1); window.guide.view([2700, 1500, 2800], [-600, 1100, -1200]); }); await pg.waitForTimeout(100); await pg.screenshot({ path: `${out}/rum_oversigt.png` });
console.log('fails', fails, 'errors', JSON.stringify(errs));
await b.close();
