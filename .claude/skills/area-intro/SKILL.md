---
name: area-intro
description: 使用者還不知道要去哪些地方時，替這趟的每個地區做簡介（城市概況、依分類的景點候選、在地美食、季節注意），產生網站上的地區簡介頁 docs/<id>/intro/index.html，讓使用者挑想去、想吃、去過的。使用者說「簡介」「有什麼好玩」「不知道去哪」「這個城市有什麼」時使用；/new-trip 問完日期與成員後也主動建議。一個地區派一個 area-scout agent。
argument-hint: "<trip-id> [地區…]（例：2026-12 重慶 成都）"
---

# 地區簡介（調度）

要做的：$ARGUMENTS

目前的旅行： !`ls trips | grep -v '^_' || true`

**什麼時候做**：新的一趟問完日期與成員之後（`trips/<id>/CLAUDE.md` 至少有地區），使用者還沒有自己的景點清單時。有沒有排行程都能跑：
沒排行程只列候選；已經排了，頁面自動標「已排」，新候選寫插在哪一段不折返。
寫好的例子：`trips/2026-12/intro/chongqing.json`、`trips/2026-12/intro/chengdu.json` → `docs/2026-12/intro/index.html`。

## 1. 決定要派幾個 agent（地區怎麼切）
- 預設**一個城市一個**（例：重慶、成都）
- 在一個城市待 4 天以上，或有「周邊一日遊」要比較的：多派一個「周邊」（檔名 `<城市>-around`，JSON 多一張 `compare` 表）
- **大城市**（東京、首爾、上海這種，候選估計 40 個以上）：先列出要切的區（例：新宿・澀谷／淺草・上野／銀座・東京站／近郊），**派之前問使用者一次**；不用切的不問
- 主題（景點／美食）不分開派：同一區的景點和吃的要放在一起看地理位置

## 2. 偏好（派之前先整理）
`trips/<id>/CLAUDE.md` 要有「## 候選與偏好」一節（範本有），格式固定，`build-intro.js` 靠它標狀態：
```
## 候選與偏好
- 去過了：寬窄巷子、東郊記憶、春熙路與太古里
- 想去：杜甫草堂、成都博物館
- 想吃：串串、夫妻肺片、甜水麵、擔擔麵
```
名稱要和 JSON 的 `name`（美食是 `type`）一樣才標得到；括號裡的字會被忽略。
- **去過了跨趟記在 Claude 的記憶**（不進 repo：repo 是公開的）。派之前讀記憶裡的「去過的地方」，把這次地區相關的寫進「去過了」
- 使用者說「去過了」「想去」「想吃」時：同時更新這一節與記憶，再跑 rebuild

## 3. 派 agent（並行）
每個地區一個 `area-scout`，**同一則訊息一起派**；最多 5 個，多的分批；model 用 sonnet。agent 看不到這段對話，任務要寫：
- 哪一趟（id）、地區名稱與檔名 `<區>`、`order`（旅程中第幾個地區）、`id` 的前綴（例 `cq-`，避免和別區撞名）、在那裡的日期與時段（例：12/9～10 整天、12/11 上午走）
- 旅客條件：人數、吃辣、體力、興趣（從 `trips/<id>/CLAUDE.md` 抄）
- 去過了、想去、想吃
- 已經排了什麼（有行程時：「看 `docs/<id>/final/index.html` 的 Day N～M」）
- 「周邊」的話：要比較哪幾個候選、能用哪一天

中途失敗（API 錯誤、用量上限）：用 SendMessage 叫同一個 agent 接著做；它會讀自己寫了一半的筆記與 JSON。

## 4. 收回來
- 跑 `node scripts/rebuild.js --trip <id>`（`build-intro.js` 在裡面；JSON 缺欄位、id 重複會直接報錯，照錯誤叫 agent 修或自己用 Edit 改 JSON）
- agent 回報的衝突記進 `trips/<id>/audit/discrepancies.md`
- **第一次做這趟的簡介**：這趟首頁加一張卡（`<a class="card" href="intro/index.html"><h2>🗺️ 地區簡介</h2><p>…</p></a>`）、行程表工具列加 `<a class="tb-link" href="../intro/index.html">🗺️ 簡介</a>`、`docs/sw.js` 的 `PRECACHE` 這趟那一段加 `./<id>/intro/index.html`
- 不派 `itinerary-reviewer`：簡介不改行程。使用者挑中的，排進行程時走 `itinerary-edit`（那時才審、才用 `trip-research` 補查官網）

## 5. 回報
- 簡介頁：`docs/<id>/intro/index.html`（部署後是 `https://<pages>/<id>/intro/`）；本機看要用瀏覽器開，或在 `docs/` 跑 `python3 -m http.server`
- 每個地區用三句話導覽（agent 回報的第 4 項），加上候選數與狀態統計（rebuild 印的那一行）
- 「未查到」「摘要」的重點；要使用者決定的（大城市怎麼切、周邊要不要去）
- 請使用者回覆想去／想吃／去過的，**不要自己排進行程**

## 照片連結
每個候選自動帶「📷 看照片」：Google 圖片＋地區的第二個（中國：百度圖片；其他：Google Maps 地點頁）。**不要用小紅書、維基**（使用者 2026-11-19）。
網站上真正放的景點照片照舊只用 Commons 自由授權（`itinerary-page.md`），而且只放在已排進行程的景點卡，簡介頁不放。
