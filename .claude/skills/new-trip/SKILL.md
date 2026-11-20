---
name: new-trip
description: 建立新的一趟旅行：複製範本、設定 id 與名稱、加進旅行列表與 Service Worker
disable-model-invocation: true
argument-hint: "<YYYY-MM> <旅行名稱>"
---

# 新增一趟

id：`$0`，名稱：`$1`（沒給就問使用者；id 是出發的年月 `YYYY-MM`，已經存在就停下來）

目前已有： !`ls trips | grep -v '^_' || true`

1. 複製範本
   ```bash
   cp -r trips/_template trips/$0 && mv trips/$0/site docs/$0 && rm trips/$0/itinerary-snippets.html
   ```
   （`itinerary-snippets.html` 留在 `trips/_template/`，排行程時從那裡複製片段）
2. 先 Read `trips/$0/CLAUDE.md`（hook 要求改 `docs/$0/` 前讀過），再把 id 與名稱**全部**換掉：
   ```bash
   grep -rl '〔YYYY-MM〕\|〔旅行名稱〕' trips/$0 docs/$0 | xargs sed -i '' -e 's/〔YYYY-MM〕/$0/g' -e 's/〔旅行名稱〕/$1/g'
   ```
3. `docs/index.html`：在 `<!-- 加一趟 -->` 註解下面、最上面加一張卡（地點只寫使用者說的地名）：
   ```html
   <a class="card is-wide" href="$0/index.html">
     <h2>〔國旗〕 $1</h2>
     <p>〔YYYY 年 M 月 D 日～D 日・N 天 N 夜｜地點〕</p>
   </a>
   ```
   日期還沒定就寫「日期未定」
4. `docs/sw.js`：`PRECACHE` 的「每一趟」註解下面加這 10 行（**只加這 10 行**；2026-11 那一段多出來的 simple、stay、rain 是那一趟自己的頁）：
   `./$0/index.html`、`./$0/hero/hero.js`、`./$0/trip.js`、`./$0/final/index.html`、`./$0/map/index.html`、`./$0/map/spot.html`、`./$0/map/places.json`、`./$0/map/routes.json`、`./$0/checklist/index.html`、`./$0/budget/index.html`
5. `node scripts/rebuild.js --trip $0`（產生空的地圖資料，`CACHE` +1；只跑一次，Stop hook 之後還會再 +1，沒關係）
6. `grep -rn "〔" trips/$0/CLAUDE.md docs/$0/index.html`：剩下的是日期、地點這類要使用者給的。
   `final/`、`checklist/`、`budget/`、`map/` 頁裡的 〔〕 是排行程時（`itinerary-edit`）才填，現在不用動

## 之後：填 `trips/$0/CLAUDE.md`
- 問使用者：日期、成員與分組（組別名稱由使用者命名）、去哪個地區（日本就讀 `reference/regions/japan.md`）、航班與住宿、已訂的東西、指定的店、規則（有推車、長輩時每段要多留幾分鐘）
- **日期、航班還沒定**：只填「概述」「候選與偏好」，不排每天的時間表
- 問完地區與成員，使用者還沒有自己的景點清單：**建議跑 `area-intro` skill**（各地區的簡介頁，讓使用者挑想去、想吃、去過的），挑完再查證、排行程
- **日期、航班已經有了**：每一節都可以填，但只寫使用者說的話（骨架、規則、清單）；票價、營業時間、車程這類數字留給 `trip-research`，查完才寫進來
- 使用者說可以公開的電話（例如民宿電話），寫進「個資（這趟的補充）」，之後的人才知道可以寫
- 頁首照片：填 `trips/$0/hero.json`，跑 `node scripts/fetch-hero-photos.js --trip $0 --candidates`，用眼睛挑過再填 `pick`
