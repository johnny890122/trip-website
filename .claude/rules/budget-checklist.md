---
paths:
  - "docs/*/budget/**"
  - "docs/*/checklist/**"
  - "docs/assets/budget.*"
  - "docs/assets/checklist.*"
  - "docs/assets/base.css"
  - "trips/_template/site/budget/**"
  - "trips/_template/site/checklist/**"
---

# 預算追蹤 docs/<id>/budget/
- 依 Day 分別記帳，每天有交通／餐飲／門票／購物／其他五類；另有「共同支出」區（機票、住宿、保險、網路等，住宿可以分段）
- 行程表中<b>已查證的門票</b>寫在頁面的 `window.BUDGET.days[].fixed`，自動計入當日小計；**改動票價時這裡要一併更新**。
  只算主行程已查證的項目，彈性方案不算；註解裡的「合計 ¥N／人」用腳本重算後寫入，不要手算
- 金額與匯率目前以日圓為準（「1 JPY =」寫在頁面，`budget.js` 用 ¥）；去別的國家要先改這兩處
- 資料存於 localStorage `budget2.*`（加前綴）

# 行前 Check List docs/<id>/checklist/
- `window.CHECKLIST` 是分組陣列：`{ id, title, note, items: [{ id, t, tag, d }] }`
- 標籤：`need` 必帶（打包的東西）／`must` 必辦（要去辦的手續）／`rec` 建議／`when` 有時限／`info` 須知
- **打包清單依用途分組**；季節性的東西集中在一組「季節加帶」，不要散在各組
- 規定類的項目要寫生效日與主管機關（行動電源、液體、藥品、退稅）；天氣寫氣象機構的平年值；緊急聯絡可以寫公開機關電話，個人電話不行
- 勾選狀態存於 localStorage `chk.<組 id>.<項 id>`（加前綴）；來源記在 `trips/<id>/reference/checklist_查證筆記.md`，時效性高的項目**出發前需重新查證**
- 範本的 Check List 只有通用的分組與項目，說明寫「〔查證後填〕」；寫好的例子見 `docs/2026-11/checklist/`
