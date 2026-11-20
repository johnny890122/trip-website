#!/usr/bin/env node
/* 改完某一趟的頁面之後跑這一支：
 *   1. 行程表格式檢查（scripts/lib/lint.js，和寫檔當下的 hook 同一套；Bash 寫的檔不經過 hook）
 *   2. build-places.js（會接著跑 build-routes.js）、build-spots.js（景點小地圖）、build-guide.js（攻略單頁）
 *   3. 那一趟有 trips/<id>/v2-home.html 的話，build-v2.js
 *   4. docs/sw.js 的 CACHE 版本號 +1（改版後已開著舊頁面的人才會換到新版）
 *
 *   node scripts/rebuild.js --trip 2026-11
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const T = require('./lib/trip').resolve();

const html = fs.readFileSync(T.itinerary, 'utf8');
const { lintHtml, bannedFor } = require('./lib/lint');
const errs = lintHtml(html, bannedFor(T.root, T.id));
if (errs.length) {
  console.error('✗ ' + path.relative(T.root, T.itinerary) + '：\n- ' + errs.join('\n- '));
  process.exit(1);
}

const run = (script) => {
  console.log('\n— ' + script + ' —');
  const r = spawnSync(process.execPath, [path.join(__dirname, script), '--trip', T.id], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
};
run('build-places.js');
run('build-spots.js');   // 景點小地圖（spots/*.json 的時間、停留點改了要重產；步行路徑有快取）
run('build-guide.js');   // 景點攻略拆成一景點一頁 guide/<id>.html
if (fs.existsSync(path.join(T.data, 'v2-home.html'))) run('build-v2.js');

const sw = path.join(T.root, 'docs', 'sw.js');
const src = fs.readFileSync(sw, 'utf8');
const m = src.match(/const CACHE = 'site-v(\d+)';/);
if (!m) { console.error('✗ docs/sw.js 找不到 CACHE 版本號'); process.exit(1); }
fs.writeFileSync(sw, src.replace(m[0], "const CACHE = 'site-v" + (+m[1] + 1) + "';"));
console.log('\n✓ 完成；docs/sw.js CACHE site-v' + m[1] + ' → site-v' + (+m[1] + 1));
