# CLAUDE.md

本檔案提供給 Claude Code (claude.ai/code) 在本 repository 工作時的指引：**怎麼整理旅遊資料**，適用每一趟旅行。

本 repository 的所有文件必須使用繁體中文撰寫（台灣用語）。

## 指示放在哪裡
| 什麼 | 在哪 | 何時載入 |
|---|---|---|
| 每一趟都適用的原則 | 本檔 | 每次 |
| 某一趟的事實與規則 | `trips/<id>/CLAUDE.md` | 碰到 `trips/<id>/` 的檔案時自動；沒讀過就改 `docs/<id>/` 會被 hook 擋下 |
| 排行程（動線、餐廳、票價）、網站與腳本 | `.claude/rules/*.md` | 碰到相關檔案時自動 |
| 各地區的查證方法 | `reference/regions/japan.md`、`china.md`（高德地圖、座標偏移） | 去那個地區的那幾趟自己讀 |
| 固定流程 | `.claude/skills/`：`itinerary-edit`（改行程）、`trip-research`（查證）、`fact-check`（審核）、`forecast`（天氣）、`web-crawler`、`/new-trip` | 呼叫時 |
| 分工的角色 | `.claude/agents/`：`trip-researcher`（查一個問題）、`fact-checker`（審幾天，只讀）、`itinerary-reviewer`（改完審一天，只讀） | skill 並行派出 |
| 自動檢查與重建 | `.claude/hooks/trip-hooks.js`（設定在 `.claude/settings.json`）：擋手改產生檔、新個資要確認、行程表格式檢查、停下時自動 `rebuild.js`。**個資與格式檢查只看得到 Edit／Write**：`trips/`、`docs/` 的檔一律用 Edit／Write 改；用 Bash 腳本（python、heredoc、重導向）寫會被擋下 | 每次寫檔、每次停下 |

## repository 結構
| 位置 | 內容 |
|---|---|
| `trips/<id>/` | 一趟的不公開資料：`CLAUDE.md`、`reference/`（查證筆記與爬蟲備份）、`audit/`、`routes.json`、`coords.json`、`attractions.json`、`hero.json`、`spots/` |
| `docs/<id>/` | 一趟的公開頁面；**`docs/<id>/final/index.html` 是那一趟唯一的正式行程**，其他頁與地圖資料都跟著它 |
| `docs/index.html` | 旅行列表（GitHub Pages 根路徑） |
| `docs/assets/`、`scripts/` | 共用的程式與樣式，不寫任何一趟的資料 |
| `trips/_template/` | 新的一趟的範本（用 `/new-trip`） |

`<id>` 是出發的年月（`YYYY-MM`）。`docs/` 整個會部署出去：**不公開的東西不要放在 `docs/`**。
改完頁面停下來時，Stop hook 會自動跑 `node scripts/rebuild.js --trip <id>`（重建地圖、新版介面、Service Worker 快取版本）；失敗會把錯誤丟回來要你修。

## 資訊正確性
- 所有旅遊資訊（票價、時間、開放時間等）必須有原始參考來源
- 旅遊資料具有時效性，資訊可能過時，請在引用前驗證
- 重要數據（票價、交通費用、營業時間）應交叉比對多個來源
- **嚴禁自行臆測**：嚴禁根據自身知識儲備直接回答景點、美食、交通等資訊。所有資訊必須透過 web search 查證後再提供，確保準確性與時效性
- **WebFetch 回傳的是摘要，數字可能被改掉**：時刻表、價格、降水機率這類要精確的數字，用 curl 抓原文核對；只從摘要來的數字在筆記標「摘要」，和原文衝突時以原文為準，衝突記進 `trips/<id>/audit/discrepancies.md`
- **查不到就寫「未查到」或「估算」「二手」**，不要補一個看起來合理的數字；筆記裡沒有的數字不要發明
- 評分、評論數這類會變的數字一律寫查詢年月；**五年以前的評價不採用**

## 參考來源
- 每個事實性資訊（票價、時刻表、地址等）必須標註來源；每個數字都要能在 `trips/<id>/reference/` 的筆記裡找到
- 抓網頁用 `web-crawler` skill，存進 `trips/<id>/reference/`；禁止轉載的網站、動態網頁、擋爬蟲的網站，只記成 `網域_查證筆記.md`（查證事實與網址）
- 發現新資訊時：先存來源 → 對照現有資料，衝突記在 `trips/<id>/audit/discrepancies.md` → 更新頁面時保留參考連結
- 在文件末尾加入「參考來源」章節，列出所有引用的 URL

## 個資
- **人名、電話、訂位代號不進 repository**：包含民宿房東、聯絡人、訂票代號、LINE 群組的內容；也適用於 Check List 與查證筆記
- 使用者給的資料要**拿掉人名、電話、訂位代號**再放進來；原始檔（PDF、截圖）只引用事實（時間、地點）
- 店家、飯店的公開地址與電話可以寫；公開機關的電話（急難救助）可以寫
- **民宿的入住方式、鑰匙箱密碼、退房時間不寫進網站**，卡片只寫「看訂房訊息（不放在公開網站）」
- 成員用組別名稱（由使用者命名）稱呼，不寫個人姓名
- 網站公開前，住宿門牌地址會被看到，先和使用者確認

## 規劃的順序
- 新的一趟還沒有日期、航班時，不要過早擬定「第幾天去哪裡」的具體時間表，先收集候選景點、美食、活動
- **分頭行動的時段由使用者決定**：使用者給了時段才排進去，不要自己猜
- 使用者指定的店、使用者給的清單**優先於 AI 推薦**

## GitHub Pages
`.github/workflows/pages.yml` 把 `docs/` 直接部署（純靜態，沒有 build step）。repository 是 private 時部署 job 直接跳過，改成 public 後自動恢復。
