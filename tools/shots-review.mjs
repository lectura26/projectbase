// visual-reviewer input: skærmbilleder ved start, midt og slut af hvert trin fra en fast vinkel,
// plus manualens side for trinnet som billede. Skriver korup/review/shots/index.json.
// Brug: node tools/shots-review.mjs [--steps 1-7] [--pdf sti/til/manual.pdf]
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { openGuide, arg } from './lib.mjs';

const range = arg('steps', '');
const only = range ? (range.includes('-') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a + k))(range.split('-').map(Number)) : range.split(',').map(Number)) : null;
const pdf = arg('pdf', process.env.MANUAL_PDF || 'korup/review/manual.pdf');
mkdirSync('korup/review/shots', { recursive: true }); mkdirSync('korup/review/manual', { recursive: true });
const { page, errors, close } = await openGuide({ width: 1280, height: 800 });
const info = await page.evaluate(() => window.guide.stepInfo());
const index = [];  // each run writes its own index file, so parallel reviewers don't overwrite each other
for (const st of info) {
  if (only && !only.includes(st.index)) continue;
  const pts = st.actions.length ? { start: (st.intro + 0.4) / st.dur, midt: (st.intro + (st.dur - st.intro) * 0.5) / st.dur, slut: 1 } : { start: 0 };
  const shots = {};
  for (const [name, p] of Object.entries(pts)) {
    await page.evaluate(({ i, p }) => window.guide.fixedView(i, p), { i: st.index, p });
    const f = `korup/review/shots/s${String(st.index).padStart(2, '0')}_${name}.png`;
    await page.screenshot({ path: f });
    shots[name] = f;
  }
  const pages = [];
  for (const pg of st.pages) {
    const f = `korup/review/manual/p-${String(pg).padStart(2, '0')}.png`;
    if (!existsSync(f) && existsSync(pdf)) execFileSync('pdftoppm', ['-r', '90', '-f', String(pg), '-l', String(pg), '-png', '-singlefile', pdf, f.replace(/\.png$/, '')]);
    if (existsSync(f)) pages.push(f);
  }
  index.push({ step: st.index, manualStep: st.manual, title: st.title, shots, manualPages: pages });
}
writeFileSync(`korup/review/shots/index${range ? '_' + range : ''}.json`, JSON.stringify({ index, errors }, null, 2));
console.log(`trin: ${index.length}, billeder: ${index.reduce((s, x) => s + Object.keys(x.shots).length, 0)}, sidefejl: ${errors.length}`);
await close();
