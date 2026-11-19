---
paths:
  - "docs/*/hero/**"
  - "scripts/fetch-hero-photos.js"
  - "scripts/fetch-spot-photos.js"
  - "trips/*/hero.json"
---

# 頁首背景照片 docs/<id>/hero/（由腳本產生，不要手動編輯）
- 清單在 `trips/<id>/hero.json`，`node scripts/fetch-hero-photos.js --trip <id>` 下載到 `docs/<id>/hero/` 並產生 `hero.js`、`credits.json`
- 來源：**Wikimedia Commons，僅收自由授權**（CC0／PD／CC-BY／CC-BY-SA），作者與授權標示於頁首下方；**全部是這趟會經過的地方**，每次載入隨機挑一張
- **選圖標準（不要放寬）**：
  1. 自由授權（`FREE` 正規表示式把關）
  2. **EXIF 拍攝日期在 `hero.json` 的 `takenAfter` 之後**（規劃那趟當天往前推五年；沒寫就從今天往前推）。上傳日期不算數 —— 很多舊照片是好幾年後才上傳的
  3. **原圖寬 ≥ 3000px 的橫式照片**。頁首是滿版、但只有約 200～250px 高的橫幅，直式照片會被裁成一條細縫
- 下載寬度 1920px（Wikimedia 的標準縮圖寬度之一，非標準寬度會被限流）；用 Pillow 重新壓縮成 progressive JPEG，每張 **500 KB 以下**（`MAX_BYTES`；需要 `python3` 與 `pip install pillow`）
- 照片上方壓一層暗色漸層罩，確保白字可讀；**太暗的夜景會被罩得幾乎全黑**，挑圖時要考慮。照片未載入、離線或這趟還沒有照片時，頁首退回漸層底色

```bash
node scripts/fetch-hero-photos.js --trip <id> --candidates   # 依標準搜尋候選，產生 scripts/.cache/hero-candidates.html
node scripts/fetch-hero-photos.js --trip <id>                # 下載 hero.json 裡 pick 指定的照片
```
- **一定要用眼睛看過再填 `pick`**，搜尋結果會混進同名的別處
- 下載時會刪掉已不在清單上的舊照片；**一張都沒下載成功時不會動既有檔案**
