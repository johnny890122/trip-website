/* Service Worker：整個網站（首頁、行程表、簡化表、地圖資料、Check List、預算）沒網路時也能開啟
 *
 * 策略
 *   - install：預先快取下面 PRECACHE 的所有頁面、樣式、程式、資料
 *   - fetch  ：同源請求一律 network-first，成功就更新快取，失敗才回快取
 *   - 跨網域請求（Google Fonts、Google Maps、Leaflet、地圖圖磚）不攔截
 *
 * 不用 cache-first 的原因：行程內容持續修正，舊快取會讓新版 HTML 配到舊版 CSS。
 * 改版時把 CACHE 的版本號 +1，舊快取會在 activate 時清掉。
 * hero 照片（約 11 MB）不預先快取，看過的才存。
 */
const CACHE = 'site-v83';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './assets/offline.js',
  './assets/base.css',
  './assets/itinerary.css',
  './assets/itinerary.js',
  './assets/map.css',
  './assets/map.js',
  './assets/spot.css',
  './assets/spot.js',
  './assets/checklist.css',
  './assets/checklist.js',
  './assets/budget.css',
  './assets/budget.js',
  './assets/home.css',
  './assets/intro.css',
  './assets/intro.js',
  // 每一趟：首頁、各頁、地圖資料、頁首照片清單（加一趟時照這一段複製一份）
  './2026-12/index.html',
  './2026-12/hero/hero.js',
  './2026-12/trip.js',
  './2026-12/final/index.html',
  './2026-12/map/index.html',
  './2026-12/map/spot.html',
  './2026-12/map/places.json',
  './2026-12/map/routes.json',
  './2026-12/checklist/index.html',
  './2026-12/guide/index.html',
  './2026-12/intro/index.html',
  // 攻略單頁（build-guide.js 產生；景點增減時這裡跟著改）
  ...['shibati', 'shanchengxiang', 'huguang', 'daijiaxiang', 'hongyadong', 'escalator', 'eling', 'liziba',
    'ciqikou', 'dufu', 'wuhou', 'yulin', 'sanxingdui', 'panda', 'cdmuseum'].map((id) => './2026-12/guide/' + id + '.html'),
  './2026-12/budget/index.html',
  './2099-11/index.html',
  './2099-11/hero/hero.js',
  './2099-11/trip.js',
  './2099-11/final/index.html',
  './2099-11/map/index.html',
  './2099-11/map/spot.html',
  './2099-11/map/places.json',
  './2099-11/map/routes.json',
  './2099-11/checklist/index.html',
  './2099-11/budget/index.html',
  './2026-11/index.html',
  './2026-11/hero/hero.js',
  './2026-11/trip.js',
  './2026-11/simple/index.html',
  './2026-11/final/index.html',
  './2026-11/map/index.html',
  './2026-11/map/spot.html',
  './2026-11/map/places.json',
  './2026-11/map/routes.json',
  './2026-11/checklist/index.html',
  './2026-11/budget/index.html',
  './2026-11/stay/index.html',
  // 新版介面（scripts/build-v2.js 產生）
  './v2/2026-11/index.html',
  './assets/v2/core.css',
  './assets/v2/home.css',
  './assets/v2/itinerary.css',
  './assets/v2/itinerary.js',
  './assets/v2/pages.css',
  './assets/v2/map.css',
  './assets/v2/v2.js',
  './v2/2026-11/simple/index.html',
  './v2/2026-11/final/index.html',
  './v2/2026-11/map/index.html',
  './v2/2026-11/map/places.json',
  './v2/2026-11/map/routes.json',
  './v2/2026-11/checklist/index.html',
  './v2/2026-11/budget/index.html',
  './v2/2026-11/stay/index.html',
  './2026-11/rain/index.html',
  './2026-11/simple-rain/index.html',
  './v2/2026-11/rain/index.html',
  './v2/2026-11/simple-rain/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 單檔失敗不讓整個安裝失敗；cache: 'reload' 避免存到瀏覽器的舊 HTTP 快取
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // 舊版每趟一支的快取叫 trip-*，一起清掉
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && (k.startsWith('site-') || k.startsWith('trip-')))
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        // ignoreSearch：CSS / JS 帶 ?v= 版本參數，預先快取的是不帶參數的網址
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') {
          // 「…/final/」這種資料夾網址對到 index.html；都沒有就回首頁
          const dir = url.pathname.endsWith('/') ? await caches.match(url.pathname + 'index.html') : null;
          return dir || caches.match('./index.html');
        }
        return Response.error();
      })
  );
});
