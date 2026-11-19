---
name: fact-check
description: 審核某一趟網站上的事實（票價、營業時間、休日、班次、地址、交通費）是否有來源、是否與來源一致，結果記在 trips/<id>/audit/。使用者說「驗證」「事實審核」「fact-check」「審核景點」「檢查資訊正確性」時使用；整趟會分組並行審。
argument-hint: "[trip-id] [Day N…]"
---

# Fact Check（調度）

範圍：$ARGUMENTS（沒寫是哪一趟就用 id 最大的；沒寫天數就是整趟）

目前的旅行： !`ls trips | grep -v '^_' || true`

1. 看 `docs/<id>/final/index.html` 有幾天（`<section class="day-section"`），把要審的天數分成**最多 4 組**（每組 2～3 天，卡片多的天自己一組）
2. 每組派一個 `fact-checker` agent，**同一則訊息一起派**（並行）。任務寫清楚：哪一趟、哪幾天（Day N 與日期）、今天日期
3. `fact-checker` 只讀不寫；收回所有結果後**由你統一寫記錄**（同時只有一個人寫，不會互相蓋掉）：
   - `trips/<id>/audit/records/YYYY-MM-DD.md`：範圍、四種狀態（✅ ⚠️ ❓ 🚫）各一張表（Day｜卡片｜項目｜頁面值｜來源值｜來源網址）
   - `trips/<id>/audit/verified.md`：追加 ✅ 的項目與驗證日期
   - `trips/<id>/audit/discrepancies.md`：追加 ⚠️、🚫 的項目
4. 回報 ⚠️ 與 🚫 的清單（Day、卡片、頁面值 → 建議值、來源）與記錄檔名；✅ 只寫數量
5. **不改 `docs/`**：使用者要修時用 `itinerary-edit` skill；🚫 的數字要補來源時用 `trip-research`
