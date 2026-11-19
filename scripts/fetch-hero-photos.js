#!/usr/bin/env node
/*
 * 從 Wikimedia Commons 抓取行程相關地標的照片，存到 docs/<trip>/hero/
 * 並產生 docs/<trip>/hero/credits.json（含作者與授權，供頁面標示出處）與 hero.js。
 * 要抓哪些地標寫在 trips/<trip>/hero.json（--trip 指定哪一趟，見 scripts/lib/trip.js）。
 *
 *   node scripts/fetch-hero-photos.js --candidates   依條件搜尋候選照片，產生預覽頁供挑選
 *   node scripts/fetch-hero-photos.js                下載 hero.json 裡 pick 指定的照片
 *
 * 選圖標準（2026-09-21 起，不要放寬）：
 *   1. 授權：只收明確標示自由授權的圖（CC0 / PD / CC-BY / CC-BY-SA）
 *   2. 拍攝日期：EXIF 拍攝時間在 TAKEN_AFTER 之後（近五年）。
 *      上傳日期不算數 —— 很多舊照片是好幾年後才上傳的
 *   3. 畫質：原圖寬度 ≥ MIN_WIDTH，且必須是橫式。
 *      頁首是滿版但只有約 200～250px 高的橫幅，直式照片會被裁成一條細縫
 *
 * 流程：先跑 --candidates，開 scripts/.cache/hero-candidates.html 用眼睛挑，
 * 把選中的檔名填進 hero.json 的 pick，再跑一次不帶參數的版本下載。
 */

const fs = require('fs');
const path = require('path');

const TRIP = require('./lib/trip').resolve();
const OUT_DIR = TRIP.heroDir;
const LIST = JSON.parse(fs.readFileSync(TRIP.heroList, 'utf8'));
const CACHE_DIR = path.join('scripts', '.cache');
const UA = 'trip-website/1.0 (personal travel itinerary)';

/* Wikimedia 只對一組標準寬度產生縮圖（非標準寬度會被限流），1920 是其中之一。
   頁首在桌機是滿版寬度，1920 在 1080p 螢幕上不必放大；手機多下載一點但畫面銳利 */
const WIDTH = 1920;
const MIN_WIDTH = 3000;
/* 近五年：hero.json 的 takenAfter（規劃那趟時往前推五年）；沒寫就從今天往前推五年 */
const TAKEN_AFTER = LIST.takenAfter || new Date(Date.now() - 5 * 365.25 * 864e5).toISOString().slice(0, 10);

/* 每一筆：slug、caption、q（Commons 搜尋字串，索引以英文為主）、pick（在預覽頁挑定的檔名；下載時只用這個，確保每次重跑結果一致） */
const WANTED = LIST.wanted;

/* 可接受的自由授權；注意要能同時對到 "CC BY-SA 4.0" 與 "Public domain" */
/* 有些 Commons 作者欄位塞了整段授權聲明，頁首只顯示人名：hero.json 的 authorOverride（slug → 人名） */
const AUTHOR_OVERRIDE = LIST.authorOverride || {};

const FREE = /^(cc0|cc[ -]by|pd|public[ -]domain|no restrictions)/i;
const isFree = (lic) => FREE.test(String(lic || '').trim());

const clean = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?format=json&' + new URLSearchParams(params);
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error('HTTP ' + res.status);
    await sleep(3000 * (i + 1));
  }
  throw new Error('Commons API 重試失敗');
}

/* EXIF 拍攝時間的寫法很雜：「2023-10-18」「2016-11-16 19:34:23」
   「7 August 2019, 16:31:48」「Taken on 15 July 2010」都有。解析不出日期就當作不合格 */
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];

function takenDate(raw) {
  const s = clean(raw);
  let m = s.match(/(\d{4})[-:/.](\d{1,2})[-:/.](\d{1,2})/);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m && MONTHS.indexOf(m[2].toLowerCase()) !== -1) {
    return m[3] + '-' + String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, '0') + '-' + m[1].padStart(2, '0');
  }
  m = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS.indexOf(m[1].toLowerCase()) !== -1) {
    return m[3] + '-' + String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0') + '-' + m[2].padStart(2, '0');
  }
  return '';
}

function describe(page) {
  const ii = page.imageinfo && page.imageinfo[0];
  if (!ii) return null;
  const em = ii.extmetadata || {};
  const cats = clean(em.Categories && em.Categories.value);
  return {
    title: page.title,
    width: ii.width,
    height: ii.height,
    taken: takenDate(em.DateTimeOriginal && em.DateTimeOriginal.value),
    takenRaw: clean(em.DateTimeOriginal && em.DateTimeOriginal.value).slice(0, 40),
    license: clean(em.LicenseShortName && em.LicenseShortName.value),
    licenseUrl: clean(em.LicenseUrl && em.LicenseUrl.value),
    artist: clean(em.Artist && em.Artist.value) || '未註明',
    descurl: ii.descriptionurl,
    thumburl: ii.thumburl,
    // Commons 社群評選過的照片：品質圖／精選圖／有價值的圖
    quality: /Quality images/i.test(cats) ? 'QI' : '',
    featured: /Featured pictures/i.test(cats) ? 'FP' : '',
    valued: /Valued images/i.test(cats) ? 'VI' : '',
  };
}

/* 不合標準的原因；空字串代表合格 */
function reject(d) {
  if (!d) return '沒有圖片資訊';
  if (!isFree(d.license)) return '授權不符：' + (d.license || '未標示');
  if (!d.taken) return '沒有可解析的拍攝日期（' + (d.takenRaw || '空白') + '）';
  if (d.taken < TAKEN_AFTER) return '拍攝於 ' + d.taken + '，超過五年';
  if (d.width < MIN_WIDTH) return '原圖寬 ' + d.width + 'px，不到 ' + MIN_WIDTH;
  if (d.width <= d.height) return '直式照片';
  return '';
}

async function search(q, thumbWidth) {
  const j = await api({
    action: 'query', generator: 'search',
    gsrsearch: 'filetype:bitmap filew:>' + (MIN_WIDTH - 1) + ' ' + q,
    gsrnamespace: '6', gsrlimit: '50',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: String(thumbWidth),
  });
  return j.query && j.query.pages ? Object.values(j.query.pages) : [];
}

async function candidates() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const out = [];
  for (const w of WANTED) {
    const seen = new Map();
    for (const q of w.q) {
      for (const p of await search(q, 330)) {
        const d = describe(p);
        if (d && !seen.has(d.title) && !reject(d)) seen.set(d.title, d);
      }
      await sleep(800);
    }
    // 社群評選過的排前面，其次解析度
    const list = [...seen.values()].sort((a, b) =>
      (!!(b.featured || b.quality || b.valued) - !!(a.featured || a.quality || a.valued))
      || (b.width * b.height - a.width * a.height)).slice(0, 12);
    out.push({ slug: w.slug, caption: w.caption, list });
    console.log((list.length ? '✓ ' : '✗ ') + w.slug.padEnd(16) + list.length + ' 張合格');
  }
  fs.writeFileSync(path.join(CACHE_DIR, 'hero-candidates.json'), JSON.stringify(out, null, 2), 'utf8');

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const html = '<!doctype html><meta charset="utf-8"><title>hero 候選</title>'
    + '<style>body{font:13px system-ui;margin:12px;background:#222;color:#eee}h2{margin:18px 0 6px;font-size:15px}'
    + '.row{display:flex;flex-wrap:wrap;gap:8px}.c{width:250px}.c img{width:250px;height:110px;object-fit:cover;display:block;border-radius:4px}'
    + '.c small{display:block;line-height:1.35;color:#bbb;word-break:break-all}.b{color:#fc6;font-weight:700}</style>'
    + out.map((g) => '<h2>' + esc(g.slug) + '｜' + esc(g.caption) + '（' + g.list.length + '）</h2><div class="row">'
      + g.list.map((d, i) => '<div class="c"><img src="' + esc(d.thumburl) + '" loading="lazy">'
        + '<small><b>#' + i + '</b> ' + esc(d.taken) + '｜' + d.width + '×' + d.height
        + ' <span class="b">' + [d.featured, d.quality, d.valued].filter(Boolean).join(' ') + '</span><br>'
        + esc(d.title.replace(/^File:/, '')) + '</small></div>').join('') + '</div>').join('');
  fs.writeFileSync(path.join(CACHE_DIR, 'hero-candidates.html'), html, 'utf8');
  console.log('\n預覽：' + path.join(CACHE_DIR, 'hero-candidates.html'));
}

/* 用 Pillow 重新存成 progressive JPEG，目標每張 MAX_BYTES 以下：
   quality 從 82 起每次降 4（最低 62），仍太大就把寬度縮到 1600 再試。
   需要 python3 與 Pillow（pip install pillow） */
const MAX_BYTES = 500 * 1024;
function recompress(buf) {
  const code = 'import sys,io\nfrom PIL import Image\n'
    + 'im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB")\n'
    + 'def enc(i,q):\n o=io.BytesIO(); i.save(o,"JPEG",quality=q,progressive=True,optimize=True); return o.getvalue()\n'
    + 'best=None\n'
    + 'for i in (im, im.resize((1600,round(im.height*1600/im.width)),Image.LANCZOS)):\n'
    + ' for q in range(82,61,-4):\n'
    + '  best=enc(i,q)\n'
    + '  if len(best)<=' + MAX_BYTES + ': break\n'
    + ' if len(best)<=' + MAX_BYTES + ': break\n'
    + 'sys.stdout.buffer.write(best)';
  return require('child_process').execFileSync('python3', ['-c', code],
    { input: buf, maxBuffer: 64 * 1024 * 1024 });
}

async function download() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const credits = [];
  const missing = WANTED.filter((w) => !w.pick);
  if (missing.length) {
    console.log('⚠ 以下地標還沒有 pick，略過：' + missing.map((w) => w.slug).join('、'));
  }

  for (const w of WANTED.filter((x) => x.pick)) {
    const j = await api({
      action: 'query', titles: w.pick, prop: 'imageinfo',
      iiprop: 'url|extmetadata|size', iiurlwidth: String(WIDTH),
    });
    const page = j.query && j.query.pages ? Object.values(j.query.pages)[0] : null;
    const d = page && page.missing === undefined ? describe(page) : null;
    const why = reject(d);
    if (why) { console.log('✗ ' + w.slug + '  ' + why + '：' + w.pick); continue; }

    const res = await fetch(d.thumburl, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.log('✗ ' + w.slug + '  下載失敗 HTTP ' + res.status); continue; }
    const raw = Buffer.from(await res.arrayBuffer());
    const buf = recompress(raw);
    fs.writeFileSync(path.join(OUT_DIR, w.slug + '.jpg'), buf);
    credits.push({
      slug: w.slug, caption: w.caption, file: w.slug + '.jpg',
      sourceTitle: d.title, sourceUrl: d.descurl,
      author: AUTHOR_OVERRIDE[w.slug] || d.artist, license: d.license, licenseUrl: d.licenseUrl,
      taken: d.taken, original: d.width + 'x' + d.height,
      bytes: buf.length,
    });
    console.log('✓ ' + w.slug.padEnd(16) + (buf.length / 1024).toFixed(0).padStart(5) + ' KB  '
      + d.taken + '  ' + d.width + '×' + d.height + '  ' + d.license);
    await sleep(500);
  }

  /* 一張都沒成功（例如還沒填 pick、或網路斷了）就不要動既有的照片與清單 */
  if (!credits.length) {
    console.log('✗ 沒有任何照片下載成功，保留原本的照片不動');
    process.exit(1);
  }

  /* 已不在清單上的舊照片一併刪掉，避免殘留在 repo 裡 */
  const keep = new Set(credits.map((c) => c.file));
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.jpg') && !keep.has(f)) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      console.log('  − 移除舊照片 ' + f);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'credits.json'), JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'Wikimedia Commons',
    criteria: '自由授權、拍攝於 ' + TAKEN_AFTER + ' 之後、原圖寬 ≥ ' + MIN_WIDTH + 'px 的橫式照片',
    photos: credits,
  }, null, 2) + '\n', 'utf8');

  /* 產生共用的 hero.js：清單直接內嵌，頁面不必再 fetch，也能被 Service Worker 快取 */
  const list = credits.map((c) => ({
    file: c.file, caption: c.caption,
    author: c.author, license: c.license, sourceUrl: c.sourceUrl,
  }));

  const heroJs = `/* 由 scripts/fetch-hero-photos.js 產生，請勿手動編輯 */
/* 照片來源：Wikimedia Commons，皆為自由授權、近五年拍攝，作者與授權標示於頁首下方 */
(function (global) {
  'use strict';

  var PHOTOS = ${JSON.stringify(list, null, 2).split('\n').join('\n  ')};

  /* 照片和本檔在同一個資料夾（docs/<trip>/hero/），頁面只要載入本檔再呼叫 applyHero() */
  var BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');

  global.applyHero = function () {
    var base = BASE;
    var host = document.querySelector('[data-hero]');
    if (!host || !PHOTOS.length) return;

    var pick = PHOTOS[Math.floor(Math.random() * PHOTOS.length)];

    var img = document.createElement('img');
    img.className = 'hero-img';
    img.alt = '';            // 純裝飾，讀螢幕軟體略過
    img.decoding = 'async';
    img.src = base + pick.file;
    // 圖還沒載完前先不顯示，避免閃一下未套用樣式的畫面
    img.addEventListener('load', function () { img.classList.add('is-loaded'); });

    var credit = document.createElement('a');
    credit.className = 'hero-credit';
    credit.href = pick.sourceUrl;
    credit.target = '_blank';
    credit.rel = 'noopener';
    credit.textContent = pick.caption + '｜' + pick.author + '／' + pick.license;

    host.insertBefore(img, host.firstChild);
    host.appendChild(credit);
  };

  global.HERO_PHOTOS = PHOTOS;
})(window);
`;

  fs.writeFileSync(path.join(OUT_DIR, 'hero.js'), heroJs, 'utf8');

  const total = credits.reduce((s, c) => s + c.bytes, 0);
  console.log('\n成功 ' + credits.length + ' 張，合計 ' + (total / 1024 / 1024).toFixed(1) + ' MB');
  console.log('已產生 credits.json 與 hero.js');
}

(process.argv.includes('--candidates') ? candidates() : download()).catch((e) => {
  console.error('✗ ' + e.message);
  process.exit(1);
});
