---
name: spot-guide
description: 行程定案後，替大景點（園區、古鎮、大型博物館，待 1.5 小時以上、裡面要選路線的）做詳細攻略：園內路線小地圖（停留點＋OSRM 步行）、每個必看點一張照片、固定格式的說明，放在這趟的景點攻略頁 docs/<id>/guide/<景點>.html，行程卡縮成一行 🧭。使用者說「景點攻略」「詳細筆記」「園區路線」「spot-guide」時使用；一個景點派一個 spot-guide-writer agent。
argument-hint: "<trip-id> <景點 id …>（例：2026-12 panda sanxingdui）"
---

# 景點詳細攻略（調度）

要做的：$ARGUMENTS

目前的旅行： !`ls trips | grep -v '^_' || true`

**什麼時候做**：行程（第幾天幾點去哪）已經定了才做。沒指定景點就列出這趟待 1.5 小時以上的主行程，**問使用者要做哪幾個**，不要自己挑。餐廳不做。
寫好的例子：`docs/2026-12/guide/panda.html`、`trips/2026-12/spots/panda.json`。

## 1. 派 agent（並行）
每個景點派一個 `spot-guide-writer`，**同一則訊息一起派**；最多 5 個，多的分批。agent 看不到這段對話，任務要寫：
- 哪一趟（id）、景點 id（同 `spots/` 的檔名與攻略頁的 section id）、第幾天（日期＋星期）
- 行程卡的時間區塊：開始時間、要離開的時間、下一張卡的時間（從 `docs/<id>/final/index.html` 讀）
- 使用者對這個景點說過的偏好（例：想先看花花）

agent 只寫自己景點的檔（spots json、自己的筆記、照片），回傳 section HTML 和行程卡的修改建議。
中途失敗就用同一份任務重派（它會讀自己寫了一半的筆記與 json 接著做）。

## 2. 貼進攻略頁 `docs/<id>/guide/index.html`
- 用 agent 回傳的 section 取代舊的 `section#<景點>`（沒有就加，`.toc` 加 `<a href="<景點>.html">`）
- 這趟還沒有攻略頁：照 2026-12 的頁面建一個（頁首、`.hint`、`.toc`、回首頁連結），加進 `docs/sw.js` 的 `PRECACHE` 與這趟首頁
- 新景點的單頁 `guide/<景點>.html` 也加進 `PRECACHE`
- `scripts/build-guide.js`（rebuild 自動跑）拆出單頁；**單頁不要手改**

## 3. 和行程表同步（自動，有界線）
照 agent 的建議用 `itinerary-edit` skill 的規則改行程卡，只能動這個景點自己的時間區塊：
- 可以直接改：卡片內文的走法、入口、順序，🧭 tip 縮成一行（`<b>一句重點 ★</b><a href="../guide/<景點>.html">看園內路線地圖與照片 →</a>`）
- **會動到別張卡的時間**：先列出改了什麼，**問使用者**再改
- 詳細步驟只放攻略頁，卡片不重複寫
- agent 回報的衝突記進 `trips/<id>/audit/discrepancies.md`

## 4. 重建、審查（並行）
跑 `node scripts/rebuild.js --trip <id>`（build-spots、build-guide 都在裡面），然後同一則訊息派：
- `itinerary-reviewer`：那一天＋攻略 section 和 spots json 一致（順序、時間、步行分鐘、圖釘號碼）
- `fact-checker`：攻略 section 的每個數字都在筆記裡、★／單一來源標得對
必修改掉（改 `index.html` 或 spots json，再 rebuild）；建議回報給使用者。

## 5. 回報
- 每個景點：路線（起 → … → 終）、步行總長與分鐘；哪些必看點有照片、哪些沒有（原因）
- 行程卡改了什麼；有沒有要使用者決定的
- 「未查到」「估算」「單一來源」的項目
- 單頁網址：`docs/<id>/guide/<景點>.html`
