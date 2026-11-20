---
paths:
  - "docs/**"
  - "scripts/**"
  - "trips/_template/**"
---

# 網站結構與建置腳本

例子是 2026-11 東京那趟。各頁面的細節在 `.claude/rules/` 的其他 rule（碰到那些檔案時才載入）：`itinerary-page.md`、`map.md`、`budget-checklist.md`、`hero-photos.md`；排行程的內容規則在 `planning.md`。

## 多趟旅行的結構

**頁面分趟、程式共用。** 一趟的東西只放在兩個地方：

| | 位置 | 內容 |
|---|---|---|
| 不公開 | `trips/<id>/` | `CLAUDE.md`（這趟的事實）、`reference/`（查證筆記與爬蟲備份）、`audit/`、`routes.json`（地圖的交通方式）、`spots/`（景點小地圖）、`coords.json`（座標）、`attractions.json`（推薦景點）、`hero.json`（頁首照片清單） |
| 公開 | `docs/<id>/` | `index.html`（這趟的首頁）、`trip.js`、`final/`、`map/`、`budget/`、`checklist/`、`hero/`，以及這趟自己加的頁面（2026-11 有 `simple/`、`rain/`、`stay/`…） |
| 共用 | `docs/assets/`、`scripts/` | 程式與樣式，**不寫任何一趟的地名或資料** |
| 範本 | `trips/_template/` | 上面兩邊的空殼：`site/` 複製成 `docs/<id>/`，其餘複製成 `trips/<id>/`；`itinerary-snippets.html` 是行程表的 HTML 片段 |

```
docs/<id>/
├── index.html              這趟的首頁（樣式 assets/home.css）
├── trip.js                 這趟的設定（id、名稱、localStorage key 前綴），每一頁都先載入它
├── final/index.html        行程表，這趟唯一的事實來源
├── map/                    index.html、spot.html（只有殼）、places.json、routes.json、spots/（腳本產生）
├── budget/index.html       window.BUDGET = { title, shared, days }，畫面與計算在 assets/budget.js
├── checklist/index.html    window.CHECKLIST = [ … ]，畫面與勾選在 assets/checklist.js
└── hero/                   頁首照片與 hero.js（fetch-hero-photos.js 產生）
```

- `docs/index.html` 是旅行列表，每一趟一張卡（手寫，最新的在上面）；`docs/v2/<id>/` 是那一趟的新版介面（有 `trips/<id>/v2-home.html` 的才有）
- **頁面只放這趟的內容與設定，程式一律放 `docs/assets/`**：不要把新的 `<script>`／`<style>` 寫進頁面
- 相對路徑：子頁在 `docs/<id>/<頁>/`，共用檔是 `../../assets/`、這趟首頁 `../index.html`、照片 `../hero/hero.js`；同一趟的其他頁是 `../map/`、`../final/`。
  `hero.js` 自己推算照片的資料夾，頁面只要載入它再呼叫 `applyHero()`
- **每個頁面都必須有回首頁（這趟的首頁）的連結**；這趟的首頁頁尾連回旅行列表
- **localStorage 分趟存**：共用程式的 key 一律經過 `TRIP.key()`（例：`2026-11:budget2.…`、`2026-11:chk.…`、`2026-11:mapPlanSel`、`2026-11:mapViews`、`2026-11:lastDay`、`2026-11:who`）。主題 `theme`、日文地名 `showJa` 是使用者偏好，不加前綴
- 腳本用 `--trip <id>` 指定哪一趟，沒寫就是 `trips/` 裡 id 最大的那一趟（`scripts/lib/trip.js`；`trips/` 底下 `YYYY-MM` 的資料夾才算一趟，`_template` 不算）。
  `build-places.js` 會把**其他趟的 `places.json` 當座標快取**，同一個地點不必再查

## 網站入口 docs/
- `docs/sw.js` / `docs/manifest.json` / `docs/icon.svg`、`icon-192.png`、`icon-512.png`、`apple-touch-icon.png` / `docs/assets/offline.js` - PWA，整個網站可離線閱讀、可加到手機桌面（全站一份）
  - Service Worker 範圍是整個網站，快取名稱 `site-v<N>`；同源請求一律 **network-first**，`CACHE` 由 Stop hook（`scripts/rebuild.js`）自動 +1；新增頁面或共用檔時要加進 `PRECACHE`（每一趟一段）。
    頁首照片不預先存，看過的才存。隱藏的頁面（例：2026-11 的 rain、simple-rain）不放 PRECACHE
  - 每一頁的 `<head>` 都載入 `assets/offline.js`（註冊 sw.js、移除舊的子範圍註冊、新版接手後自動重新整理一次），並連到根目錄的 `manifest.json` 與 `apple-touch-icon.png`。
    沒有自動重新整理的話，改版當下已開著舊頁面的人會停在「新 HTML ＋ 舊 CSS／JS」的半舊狀態
  - 這趟首頁的「📲 存到手機桌面」按鈕：Android Chrome 跳安裝視窗（`beforeinstallprompt`），iOS 只能顯示「分享 → 加入主畫面」的步驟。地圖底圖、Leaflet、Google Maps 離線不能用
- `docs/v2/<id>/` - **新版介面（日系繪本風）**，由 `node scripts/build-v2.js --trip <id>` 產生，**不要手改**。子頁是 `docs/<id>/<頁>/index.html` 的複本，改資源路徑、加頂端固定選單、多載入 `docs/assets/v2/` 的外觀（`core.css` 色票與選單、`itinerary.css`/`itinerary.js`、`pages.css`、`map.css`、`home.css`、`v2.js`）；
  首頁樣板是 `trips/<id>/v2-home.html`（這趟專屬；航班取自行程表、住宿取自這趟的首頁，去回程日期寫在樣板的 `<!-- flight-dates: … -->`）。
  舊版頁面有修改時，Stop hook 會自動重跑 `build-v2.js` 並把 `CACHE` +1；`docs/v2/` 手改會被 PreToolUse hook 擋下。新版只用淺色底（`data-theme="light"` 固定）；localStorage 與舊版共用。新的一趟預設不做新版
- `docs/assets/base.css` - 預算、Check List 共用樣式；`docs/assets/home.css` - 旅行列表與每趟首頁共用

## 建置腳本 scripts/
- `scripts/lib/trip.js` - 多趟旅行：解析 `--trip <id>`、各趟的路徑；沒寫 `--trip` 時用 `DEFAULT`（`trips/` 裡 id 最大的那一趟）
- `scripts/build-places.js` - 從行程表產生地圖資料（`.claude/rules/map.md`）
  - 解析標題的正規表示式必須列出標題後面可能出現的所有 span
    （`.tl-tag`／`.tl-kind`／`.tl-plan`）。少列一個，那個 span 的文字就會被吃進標題，
    地圖上會出現「入住｜某某民宿 主行程」這種標題
- `scripts/build-routes.js` - 依 `trips/<trip>/routes.json` 產生地圖上依交通方式的實際路線（每一天、每一組彈性方案；`.claude/rules/map.md`）
  - 支援 `"way": <id>`（OSM 上只有一條 way 的路線）與
    `"stations": { "站名": [緯度, 經度] }`（relation 的站序缺了某一站時指定座標）
  - 支援 `{ "mode": "car", "label": "…" }`（OSRM 開車路徑，直接開到下一站門口；用於接駁車、計程車、高速バス、河口湖周遊バス）、
    區段的 `"who": "family"／"solo"`（分頭行動的兩條線各自相連，見 `.claude/rules/itinerary-page.md`）
  - HTTP 回應要收齊 Buffer 再解碼：一塊一塊轉字串，切在中日文字中間會變亂碼（曾讓 relation 的站名壞掉），快取裡壞掉的 relation 要刪掉重抓
- `scripts/build-spots.js` - 依 `trips/<trip>/spots/*.json` 產生景點小地圖的步行路線（`docs/<trip>/map/spots/`）
- `scripts/build-guide.js` - 把 `docs/<trip>/guide/index.html` 的每個 `section.guide` 拆成單頁 `guide/<id>.html`（產生檔，不要手改；rebuild 自動跑）
- `scripts/build-intro.js` - 把 `trips/<trip>/intro/*.json`（`area-scout` 寫的，一區一檔）產生成地區簡介頁 `docs/<trip>/intro/index.html`（產生檔，不要手改；rebuild 自動跑，要在 build-places 之後）。
  狀態自動判斷：`q` 和行程表 `?q=` 一樣＝已排；`trips/<trip>/CLAUDE.md`「## 候選與偏好」的去過了／想去／想吃；`skip`＝不建議。樣式 `assets/intro.css`、篩選 `assets/intro.js`
- `scripts/fetch-spot-photos.js` - 抓景點卡片的照片（`.claude/rules/itinerary-page.md`「景點卡片的照片與小地圖」）
- `scripts/fetch-hero-photos.js` - 重新抓取頁首背景照片，並用 Pillow 壓縮到每張 500 KB 以下（`.claude/rules/hero-photos.md`）
- `scripts/build-v2.js` - 產生 `docs/v2/<id>/`（見「網站入口」）；只有放了 `trips/<id>/v2-home.html` 的那一趟才能跑
- `scripts/rebuild.js` - 改完頁面後的一條龍（Stop hook 自動跑）：檢查每個項目都有 `.tl-kind`、`build-places.js`（接著 `build-routes.js`）、有 v2 就 `build-v2.js`、`docs/sw.js` 的 `CACHE` +1
