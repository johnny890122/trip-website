/* 多趟旅行：建置腳本要處理哪一趟。
 *
 *   node scripts/build-places.js --trip 2026-11
 *   node scripts/build-places.js               ← 沒寫 --trip 就是 DEFAULT（trips/ 裡 id 最大的那一趟）
 *
 * 每一趟各自的檔案：
 *   trips/<id>/                  不公開：CLAUDE.md、reference/、routes.json、spots/、coords.json、attractions.json、hero.json
 *   docs/<id>/                   公開的頁面；final/index.html 是這趟唯一的事實來源
 *   docs/<id>/map/               地圖資料：places.json、routes.json、spots/（由腳本產生）
 *   docs/<id>/hero/              頁首照片（由 fetch-hero-photos.js 產生）
 * 共用的：scripts/、scripts/.cache/、docs/assets/
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/* trips/ 底下 YYYY-MM 的資料夾就是一趟旅行（_template 不算） */
function list() {
  const dir = path.join(ROOT, 'trips');
  return fs.readdirSync(dir).filter((d) => /^\d{4}-\d{2}$/.test(d) && fs.statSync(path.join(dir, d)).isDirectory()).sort();
}

const DEFAULT = list().slice(-1)[0];

function paths(id) {
  const data = path.join(ROOT, 'trips', id);
  const docs = path.join(ROOT, 'docs', id);
  return {
    id,
    root: ROOT,
    docs,
    data,
    coords: path.join(data, 'coords.json'),
    attractions: path.join(data, 'attractions.json'),
    heroList: path.join(data, 'hero.json'),
    heroDir: path.join(docs, 'hero'),
    itinerary: path.join(docs, 'final', 'index.html'),
    mapDir: path.join(docs, 'map'),
  };
}

/* 從命令列讀 --trip；argv 會拿掉 --trip 與它的值，剩下的照原本的方式解析 */
function resolve() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--trip');
  const id = i >= 0 ? argv[i + 1] : DEFAULT;
  if (i >= 0) argv.splice(i, 2);
  if (!id || !list().includes(id)) {
    console.error('✗ 找不到這趟旅行：' + id + '（trips/ 裡有：' + list().join('、') + '）');
    process.exit(1);
  }
  return Object.assign(paths(id), { argv });
}

module.exports = { ROOT, DEFAULT, list, paths, resolve };
