---
name: itinerary-edit
description: 改某一趟的行程表時使用：調整時間或順序、換景點或餐廳、加交通卡，或使用者給了訂位確認、票券、航班異動要套進行程。負責動線檢查、拿掉個資、同步其他頁面、重建地圖與快取。
argument-hint: "[要改什麼]"
---

# 改行程

要改的：$ARGUMENTS

目前的旅行： !`ls trips | grep -v '^_' || true`

## 1. 先讀
- `trips/<id>/CLAUDE.md`（這趟的事實與只適用這趟的規則）；去日本再讀 `reference/regions/japan.md`
- `docs/<id>/final/index.html` 裡要改的那一天（`.claude/rules/planning.md`、`itinerary-page.md` 會跟著載入）

## 2. 使用者給了訂位、票券、航班異動
- 只取事實：日期、時間、班次、店名、人數、公開地址、店家或飯店電話
- **不寫進 repo**：人名、個人電話、訂位代號、確認碼、LINE 內容、入住方式、密碼；截圖與 PDF 不放進 repo
- 已訂的項目改成 `.is-main` 主行程，拿掉替代方案

## 3. 改之前：動線
- 把當天地點照新順序列一行（`住宿 → A → B → … → 住宿`），確認是單向掃過、沒有折返
- 每一段：前一張卡的結束時間＋交通時間 ≤ 下一張卡的開始；要趕的班次寫出那一班和錯過時的下一班
- 需要的班次、票價、營業時間在 `trips/<id>/reference/` 沒有的，先用 `trip-research` skill 查，不要用記憶補

## 4. 同步（同一件事出現在好幾處）
| 改了 | 也要改 |
|---|---|
| 時間或順序 | `trips/<id>/routes.json` 對應區段的 `from`／`to`（key 是卡片時間）；有簡化版的（2026-11 的 `simple/`、`simple-rain/`）一起改 |
| 票價 | `docs/<id>/budget/index.html` 的 `fixed` |
| 訂位、預約、出發前要查的 | `docs/<id>/checklist/index.html` 的「已預約項目確認」「要先訂、要先查的」兩組（範本沒有就加；這趟規則說不列的不列） |
| 每天主題、關鍵班次、住宿、航班 | `trips/<id>/CLAUDE.md` 的表格；住宿、航班也在 `docs/<id>/index.html` 與行程表的航班列 |
| 新地點 | 卡片的 `.map-link`（明文地名）；門牌或店家座標寫進 `trips/<id>/coords.json` |
| 新查到的事實 | `trips/<id>/reference/` 的查證筆記（來源網址＋查證日期） |

## 5. 審查（第二雙眼睛）
改到的每一天各派一個 `itinerary-reviewer` agent，**同一則訊息一起派**（並行）。任務寫：哪一趟、Day N 與日期、這次改了什麼。
回來的「必修」都改掉；「建議」寫進回報讓使用者決定。

## 6. 重建（自動）
停下來時 Stop hook 會跑 `node scripts/rebuild.js --trip <id>`（地圖、新版介面、`CACHE` +1）；失敗會把錯誤丟回來。
**你是被派出去的 agent 時 Stop hook 不會跑**：回報前自己跑一次 `node scripts/rebuild.js --trip <id>`，有錯先修。錯誤的意思：
- 「缺哪一段」→ 補 `routes.json`；「沒用到的區段／case」→ `routes.json` 的時間沒跟著改；「步行超過 2.6 km」→ 確認是不是少寫了搭車
- 寫檔當下 PostToolUse hook 就會擋格式錯誤（`.tl-kind`、地圖連結編碼、計畫B 的 `.map-link`、方案標題）

## 7. 回報
- 改了哪一天、新的順序（地點 → 地點）
- 哪些數字是新查的（筆記檔名）、哪些寫「未查到／估算」
- 使用者還要自己確認的事
