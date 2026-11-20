/* 地區簡介頁：把 trips/<trip>/intro/*.json（area-scout agent 寫的，一區一檔）產生成 docs/<trip>/intro/index.html。
 *
 *   node scripts/build-intro.js --trip 2026-12      # rebuild.js 會自動跑（要在 build-places.js 之後）
 *
 * 每個候選的狀態自動判斷，優先順序：
 *   已排   ＝ item.q 和行程表地圖連結的 ?q= 完全一樣（讀 docs/<trip>/map/places.json 的 places 與 slots）
 *   去過了 ＝ trips/<trip>/CLAUDE.md「## 候選與偏好」的「- 去過了：」列了 item.name
 *   不建議 ＝ item.skip 有寫理由
 *   想去   ＝ 偏好的「- 想去：」或「- 想吃：」列了 item.name（美食用 type）
 *   新候選 ＝ 其他
 * JSON 格式見 .claude/skills/area-intro/SKILL.md。產生的頁面不要手改：改 JSON 或偏好再跑 rebuild。
 */
const fs = require('fs');
const path = require('path');
const T = require('./lib/trip').resolve();

const srcDir = path.join(T.data, 'intro');
const outDir = path.join(T.docs, 'intro');
const files = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort() : [];
if (!files.length) { console.log('這趟（' + T.id + '）沒有地區簡介（trips/' + T.id + '/intro/*.json）'); process.exit(0); }

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const WD = '日一二三四五六';
const md = (d) => { const t = new Date(d + 'T00:00:00'); return (t.getMonth() + 1) + '/' + t.getDate() + '（' + WD[t.getDay()] + '）'; };

/* ---- 行程表裡的地點：q → 第幾天幾點 ---- */
const scheduled = new Map();
const placesFile = path.join(T.mapDir, 'places.json');
if (fs.existsSync(placesFile)) {
  const p = JSON.parse(fs.readFileSync(placesFile, 'utf8'));
  const add = (q, day, date, time, plan) => {
    if (!q || scheduled.has(q)) return;
    scheduled.set(q, { day, label: md(date) + ' ' + time + (plan && plan !== 'A' ? '（方案 ' + plan + '）' : '') });
  };
  for (const x of p.places || []) add(x.query, x.day, x.date, x.time);
  for (const s of p.slots || []) for (const pl of s.plans || []) for (const pt of pl.pts || []) add(pt.query, s.day, s.date, s.time, pl.k);
}

/* ---- 偏好：trips/<trip>/CLAUDE.md 的「## 候選與偏好」 ---- */
const prefs = { visited: new Set(), want: new Set() };
const claude = path.join(T.data, 'CLAUDE.md');
if (fs.existsSync(claude)) {
  const sec = (fs.readFileSync(claude, 'utf8').split(/^## 候選與偏好\s*$/m)[1] || '').split(/^## /m)[0];
  for (const line of sec.split('\n')) {
    const m = line.match(/^-\s*(去過了|想去|想吃)[：:]\s*(.+)$/);
    if (!m) continue;
    const names = m[2].replace(/（[^）]*）|\([^)]*\)/g, '').split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
    for (const n of names) (m[1] === '去過了' ? prefs.visited : prefs.want).add(n);
  }
}

const STATUS = {
  done: ['已排', 't-done'], visited: ['去過了', 't-visited'], skip: ['不建議', 't-skip'],
  want: ['想去', 't-want'], new: ['新候選', 't-new'],
};
function status(item, nameKeys) {
  const hit = item.q && scheduled.get(item.q);
  if (hit) return { k: 'done', note: hit.label, day: hit.day };
  if (nameKeys.some((n) => prefs.visited.has(n))) return { k: 'visited' };
  if (item.skip) return { k: 'skip', note: item.skip };
  if (nameKeys.some((n) => prefs.want.has(n))) return { k: 'want' };
  return { k: 'new' };
}

/* ---- 看照片的連結：Google 圖片＋地區的第二個 ---- */
let country = 'jp';
try { country = JSON.parse(fs.readFileSync(T.coords, 'utf8')).country || 'jp'; } catch (e) { /* 沒有 coords.json 就當日本 */ }
function photoLinks(q) {
  const e = encodeURIComponent(q);
  const second = country === 'cn'
    ? ['百度圖片', 'https://image.baidu.com/search/index?tn=baiduimage&word=' + e]
    : ['Google Maps', 'https://www.google.com/maps/search/' + e];
  return '<div class="in-pics"><span>📷 看照片</span>'
    + '<a href="https://www.google.com/search?tbm=isch&amp;q=' + e + '" target="_blank" rel="noopener">Google 圖片</a>'
    + '<a href="' + second[1] + '" target="_blank" rel="noopener">' + second[0] + '</a></div>';
}

const tag = (st) => '<span class="in-tag ' + STATUS[st.k][1] + '">' + STATUS[st.k][0] + (st.k === 'done' ? ' ' + esc(st.note) : '') + '</span>';
const srcLinks = (src) => (Array.isArray(src) ? src : src ? [src] : [])
  .map((u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">來源' + (i ? i + 1 : '') + '</a>').join(' ');

const counts = { done: 0, visited: 0, skip: 0, want: 0, new: 0 };
const ids = new Set();

function itemCard(it, areaName) {
  for (const k of ['id', 'name', 'q', 'what']) if (!it[k]) throw new Error(areaName + '：候選缺 ' + k + '：' + JSON.stringify(it).slice(0, 120));
  if (ids.has(it.id)) throw new Error('候選 id 重複：' + it.id);
  ids.add(it.id);
  const st = status(it, [it.name]);
  counts[st.k]++;
  const facts = [it.where, [it.hours, it.fee].filter(Boolean).join('・'), it.stay && '建議停留 ' + it.stay].filter(Boolean);
  const done = st.k === 'done' ? '<div class="in-fit"><a href="../final/index.html#day-' + st.day + '">看行程表 Day ' + st.day + ' →</a></div>' : '';
  const fit = st.k === 'skip' ? '<div class="in-fit">' + esc(st.note) + '</div>'
    : (st.k !== 'done' && st.k !== 'visited' && it.fit) ? '<div class="in-fit"><b>放哪：</b>' + esc(it.fit) + '</div>' : '';
  return '<div class="in-card" data-st="' + st.k + '" id="' + esc(it.id) + '">'
    + '<div class="in-hd"><h4>' + esc(it.name) + '</h4>' + tag(st) + '</div>'
    + '<p>' + esc(it.what) + '</p>'
    + (facts.length ? '<div class="in-facts">' + facts.map(esc).join('<br>') + '</div>' : '')
    + done + fit
    + '<div class="in-src">' + esc([it.grade, it.asof && it.asof + ' 查'].filter(Boolean).join('・')) + ' ' + srcLinks(it.src) + '</div>'
    + photoLinks(it.q) + '</div>';
}

function foodTable(food) {
  const rows = food.map((f) => {
    const st = status(f, [f.type]);
    const shops = (f.shops || []).map((s) => {
      const sst = s.q && scheduled.get(s.q);
      return esc(s.name) + '　' + esc([s.rating, s.price, s.hours].filter(Boolean).join('・'))
        + (sst ? ' <span class="in-tag t-done">已排 ' + esc(sst.label) + '</span>' : '')
        + (s.src ? ' ' + srcLinks(s.src) : '');
    }).join('<br>');
    return '<tr data-st="' + st.k + '"><td>' + esc(f.type) + (st.k === 'want' ? ' ' + tag(st) : '') + '</td><td>' + esc(f.what) + '</td><td>' + (shops || '店家未查到') + '</td></tr>';
  }).join('\n');
  return '<div class="in-tbl"><table><thead><tr><th>類型</th><th>是什麼</th><th>店（評分／人均／營業）</th></tr></thead><tbody>\n' + rows + '\n</tbody></table></div>';
}

function compareTable(cmp) {
  const cols = cmp.columns || [];
  return '<div class="in-tbl"><table><thead><tr>' + cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>'
    + (cmp.rows || []).map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('')
    + '</tbody></table></div>' + (cmp.note ? '<p class="hint">' + esc(cmp.note) + '</p>' : '');
}

const areas = files.map((f) => {
  const a = JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8'));
  if (!a.area) throw new Error(f + ' 缺 area');
  a._id = f.replace(/\.json$/, '');
  return a;
}).sort((x, y) => (x.order || 99) - (y.order || 99));   // 照旅行順序（JSON 的 order），沒寫的排後面

const sections = areas.map((a) => {
  const parts = [];
  parts.push('<p class="section-title" id="' + esc(a._id) + '">' + esc(a.area) + (a.days ? '　<span class="in-days">' + esc(a.days) + '</span>' : '') + '</p>');
  if (a.about && a.about.length) parts.push('<div class="panel"><div class="panel-body in-about"><ul>' + a.about.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul></div></div>');
  for (const c of a.categories || []) {
    parts.push('<h3 class="in-cat">' + esc(c.name) + '</h3><div class="in-grid">' + (c.items || []).map((it) => itemCard(it, a.area)).join('\n') + '</div>');
  }
  if (a.compare) parts.push('<h3 class="in-cat">' + esc(a.compare.title || '比較') + '</h3>' + compareTable(a.compare));
  if (a.food && a.food.length) parts.push('<h3 class="in-cat">吃什麼（一個人也方便）</h3>' + foodTable(a.food));
  if (a.slots && a.slots.length) parts.push('<h3 class="in-cat">依時段挑</h3><div class="in-grid">' + a.slots.map((s) => '<div class="in-slot"><h4>' + esc(s.when) + '</h4><p>' + esc(s.text) + '</p></div>').join('') + '</div>');
  if (a.season && a.season.length) parts.push('<h3 class="in-cat">季節注意</h3><div class="panel"><div class="panel-body"><ul>' + a.season.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul></div></div>');
  const upd = a.updated ? '<p class="hint">' + esc(a.area) + '：' + esc(a.updated) + ' 整理' + (a.note ? '。' + esc(a.note) : '') + '</p>' : '';
  return parts.join('\n') + upd;
}).join('\n\n');

/* ---- 頁首沿用這趟首頁的名稱 ---- */
let tripName = T.id;
try { tripName = (fs.readFileSync(path.join(T.docs, 'trip.js'), 'utf8').match(/name:\s*'([^']+)'/) || [])[1] || T.id; } catch (e) { /* 沒有 trip.js */ }

const filters = [['all', '全部']].concat(Object.keys(STATUS).map((k) => [k, STATUS[k][0]]))
  .map(([k, label]) => '<button type="button" class="in-filter' + (k === 'all' ? ' is-on' : '') + '" data-f="' + k + '">' + label
    + (k === 'all' ? '' : ' <small>' + counts[k] + '</small>') + '</button>').join('');

const html = `<!DOCTYPE html>
<!-- 由 scripts/build-intro.js 從 trips/${T.id}/intro/*.json 產生，不要手改 -->
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>地區簡介｜${esc(tripName)}</title>
<meta name="description" content="${esc(tripName)}：各地區的簡介與景點、美食候選">
<meta name="theme-color" content="#B5451B">
<link rel="stylesheet" href="../../assets/base.css">
<link rel="stylesheet" href="../../assets/intro.css">
<link rel="manifest" href="../../manifest.json">
<link rel="icon" href="../../icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../../apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(tripName)}">
<script src="../../assets/offline.js" defer></script>
</head>
<body>

<header class="site-header">
  <div class="container">
    <h1>🗺️ 地區簡介：挑想去的地方</h1>
    <p class="sub">${areas.map((a) => esc(a.area)).join('・')}｜時間與票價多為二手資料，排進行程前會再查證</p>
    <div class="toolbar">
      <a class="tb-link" href="../index.html">← 回首頁</a>
      <a class="tb-link" href="../final/index.html">📅 行程表</a>
      <a class="tb-link" href="../map/index.html">🗺️ 地圖</a>
    </div>
  </div>
</header>

<main>
  <div class="container">
    <nav class="toc">${areas.map((a) => '<a href="#' + esc(a._id) + '">' + esc(a.area) + '</a>').join('')}</nav>
    <div class="in-filters" role="group" aria-label="依狀態篩選">${filters}</div>

${sections}

  </div>
</main>

<script src="../../assets/intro.js"></script>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('✓ 地區簡介：' + areas.length + ' 區、' + ids.size + ' 個候選（已排 ' + counts.done + '、去過了 ' + counts.visited
  + '、不建議 ' + counts.skip + '、想去 ' + counts.want + '、新候選 ' + counts.new + '）');
