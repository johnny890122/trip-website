#!/usr/bin/env node
/* 產生新版介面（日系繪本風）：docs/v2/
 *
 * 新版和舊版共用同一份內容與程式，只多套一層外觀：
 *   - 子頁：把 docs/<trip>/<頁>/index.html 複製到 docs/v2/<trip>/<頁>/，改資源路徑、加上固定選單與 docs/assets/v2/ 的樣式
 *   - 首頁：trips/<trip>/v2-home.html 樣板（這趟專屬），航班取自行程表、住宿取自這趟的首頁 docs/<trip>/index.html，寫到 docs/v2/<trip>/index.html
 *   - 地圖資料 places.json、routes.json 直接複製
 * 舊版頁面有任何修改，都要重跑一次：node scripts/build-v2.js --trip <trip>
 * 只有放了 trips/<trip>/v2-home.html 的那一趟才有新版介面。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'docs');
const T = require('./lib/trip').resolve();
const TRIP = T.id;
const HOME_TPL = path.join(T.data, 'v2-home.html');
if (!fs.existsSync(HOME_TPL)) { console.error('✗ ' + TRIP + ' 沒有 v2 首頁樣板（trips/' + TRIP + '/v2-home.html），這趟不產生新版介面'); process.exit(1); }
const OUT = path.join(ROOT, 'v2');
const V2_ASSETS = path.join(ROOT, 'assets', 'v2');

// 頁面 → 外觀檔（docs/assets/v2/<skin>.css，同名 .js 有才載入）
const PAGES = { final: 'itinerary', simple: 'itinerary', rain: 'itinerary', 'simple-rain': 'itinerary', map: 'map', checklist: 'pages', budget: 'pages', stay: 'pages' };

const MENU = [
  ['home', '../index.html', '🏠', '首頁'],
  ['final', '../final/index.html', '📅', '行程'],
  ['simple', '../simple/index.html', '⏰', '簡化'],
  ['map', '../map/index.html', '🗺️', '地圖'],
  ['checklist', '../checklist/index.html', '✅', '清單'],
  ['budget', '../budget/index.html', '💴', '預算'],
  ['stay', '../stay/index.html', '🏠', '住宿'],
];
MENU[0][2] = '⛩️';

function menu(current, fix) {
  const items = MENU.map(([id, href, ico, label]) =>
    `<a href="${fix(href)}"${id === current ? ' class="is-here" aria-current="page"' : ''}><span aria-hidden="true">${ico}</span>${label}</a>`).join('');
  return `<nav class="v2-menu" aria-label="主選單"><div class="v2-menu-in">${items}</div></nav>`;
}

const read = (f) => fs.readFileSync(f, 'utf8');
function write(f, s) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); }

const FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Huninn&display=swap">';

for (const [page, skin] of Object.entries(PAGES)) {
  const src = path.join(ROOT, TRIP, page, 'index.html');
  if (!fs.existsSync(src)) continue;   // 這趟沒有這一頁
  let html = read(src);
  html = html
    .split('../../assets/').join('../../../assets/')
    .split('../../manifest.json').join('../../../manifest.json')
    .split('../../icon.svg').join('../../../icon.svg')
    .split('../../apple-touch-icon.png').join('../../../apple-touch-icon.png')
    .split('"../hero/').join(`"../../../${TRIP}/hero/`)
    .split('"../trip.js"').join(`"../../../${TRIP}/trip.js"`)
    .replace(/<meta name="theme-color" content="[^"]*">/, '<meta name="theme-color" content="#FFFCF6">')
    .replace('<html lang="zh-TW">', `<html lang="zh-TW" class="v2 v2-${page}" data-theme="light">`);
  const A = '../../../assets/v2/';
  let head = `${FONT}<link rel="stylesheet" href="${A}core.css"><link rel="stylesheet" href="${A}${skin}.css"><script src="${A}v2.js" defer></script>`;
  if (fs.existsSync(path.join(V2_ASSETS, skin + '.js'))) head += `<script src="${A}${skin}.js" defer></script>`;
  html = html.replace('</head>', head + '\n</head>').replace(/<body([^>]*)>/, (m) => m + '\n' + menu(page, (h) => h));
  if (!html.includes('class="v2 ') || !html.includes('v2-menu')) throw new Error(page + '：套用失敗');
  write(path.join(OUT, TRIP, page, 'index.html'), html);
}
for (const f of ['places.json', 'routes.json']) fs.copyFileSync(path.join(ROOT, TRIP, 'map', f), path.join(OUT, TRIP, 'map', f));

// ---- 首頁 ----
const flights = [];
const re = /<strong>(.+?)<\/strong> (\d\d:\d\d)<span class="fb-ap"> (\w+)<\/span> → (\d\d:\d\d)<span class="fb-ap"> (\w+)<\/span>/g;
const finalHtml = read(path.join(ROOT, TRIP, 'final', 'index.html'));
for (let m; (m = re.exec(finalHtml));) flights.push(m.slice(1));
if (!flights.length) throw new Error('行程表的航班列抓不到航班');
/* 去程、回程的日期寫在樣板裡：<!-- flight-dates: 11/14（六）|11/22（日） --> */
const [outDate, backDate] = ((read(HOME_TPL).match(/<!-- flight-dates: (.*?) -->/) || [])[1] || '|').split('|');
const flightHtml = flights.map(([who, t1, a1, t2, a2]) => {
  const out = who.startsWith('去程');
  return `<div class="flight ${out ? 'is-out' : 'is-back'}"><div class="flight-who"><b>${out ? outDate : backDate}</b>${who}</div>`
    + `<div class="flight-line"><span><b>${t1}</b>${a1}</span><i aria-hidden="true">✈</i><span><b>${t2}</b>${a2}</span></div></div>`;
}).join('\n      ');

const oldHome = read(path.join(ROOT, TRIP, 'index.html'));
const stay = oldHome.slice(oldHome.indexOf('<h3 class="group">🏠 住宿</h3>'), oldHome.indexOf('<h3 class="group">☔ 雨天備案</h3>'))
  .replace(/<h3 class="group">.*?<\/h3>/, '').trim();
if (!stay.includes('class="card stay') || stay.includes('v2/index.html') || stay.includes('rain/')) throw new Error('舊首頁抓不到住宿卡片');

const home = read(HOME_TPL)
  .replace('{{MENU}}', menu('home', (h) => h.replace('../', '')))
  .replace('{{FLIGHTS}}', flightHtml)
  .replace('{{STAY}}', stay);
write(path.join(OUT, TRIP, 'index.html'), home);
console.log('v2：首頁 + ' + Object.keys(PAGES).length + ' 個子頁已產生');
