/* 景點攻略的單頁：把 docs/<trip>/guide/index.html（來源、全部景點一頁）的每個 section.guide
 * 拆成 docs/<trip>/guide/<id>.html，行程卡的 🧭 連到這裡（不用 # 定位，file:// 也打得開）。
 *
 *   node scripts/build-guide.js --trip 2026-12      # rebuild.js 會自動跑
 *
 * 產生的頁面不要手改：改 index.html 再跑 rebuild。拿掉的景點，舊頁面會一起刪掉。
 */
const fs = require('fs');
const path = require('path');
const TRIP = require('./lib/trip').resolve();

const dir = path.join(TRIP.root, 'docs', TRIP.id, 'guide');
const src = path.join(dir, 'index.html');
if (!fs.existsSync(src)) { console.log('這趟（' + TRIP.id + '）沒有景點攻略頁'); process.exit(0); }

const html = fs.readFileSync(src, 'utf8');
const head = html.slice(0, html.indexOf('<main>'));
const foot = html.slice(html.indexOf('</main>'));
const hint = (html.match(/<p class="hint">[\s\S]*?<\/p>/) || [''])[0];
const sections = [...html.matchAll(/<section class="panel guide" id="([a-z0-9-]+)">[\s\S]*?<\/section>/g)];
if (!sections.length) throw new Error(src + ' 找不到 <section class="panel guide" id="…">');

const ids = new Set();
for (const [sec, id] of sections) {
  if (id === 'index') throw new Error('景點 id 不能叫 index');
  ids.add(id);
  const name = sec.match(/<h2>(.*?)<\/h2>/)[1];
  const plain = name.replace(/<[^>]+>/g, '').replace(/^\S+\s+/, '');   // 去掉 emoji
  const page = head
    .replace(/<title>[^<]*｜/, '<title>' + plain + '｜')
    .replace(/<h1>[^<]*<\/h1>/, '<h1>' + name + '</h1>')
    .replace('<div class="toolbar">', '<div class="toolbar">\n      <a class="tb-link" href="index.html">🧭 全部景點</a>')
    + '<main>\n  <div class="container">\n\n    ' + hint + '\n\n    ' + sec + '\n\n  </div>\n' + foot;
  // 註解放在 DOCTYPE 後面：放前面會讓瀏覽器進 quirks mode
  fs.writeFileSync(path.join(dir, id + '.html'),
    page.replace(/^<!DOCTYPE html>\n/i, '<!DOCTYPE html>\n<!-- 由 scripts/build-guide.js 從 index.html 產生，不要手改 -->\n'));
}
for (const f of fs.readdirSync(dir)) {
  if (f.endsWith('.html') && f !== 'index.html' && !ids.has(f.slice(0, -5))) fs.rmSync(path.join(dir, f));
}
console.log('✓ 景點攻略：' + ids.size + ' 頁（' + [...ids].join('、') + '）');
