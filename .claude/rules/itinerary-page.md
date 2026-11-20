---
paths:
  - "docs/*/final/**"
  - "docs/*/simple/**"
  - "docs/*/simple-rain/**"
  - "docs/*/rain/**"
  - "docs/assets/itinerary.*"
  - "docs/assets/v2/**"
  - "trips/_template/itinerary-snippets.html"
  - "trips/_template/site/final/**"
---

# 行程表功能說明（docs/<trip>/final/index.html，請勿移除）
> 程式在 `docs/assets/itinerary.js`、樣式在 `docs/assets/itinerary.css`。以下提到的 Day 幾、店家、景點都是這趟 2026-11 的例子。
> 天數由頁面上 `.day-section` 的數量決定。

- **逐日切換**：`showDay(n)` 一次只顯示一天。初始顯示順序為：網址 `#day-N` > 今天的日期 > 上次瀏覽的日期（localStorage `lastDay`）
- **切換方式**：日期列點擊、鍵盤左右方向鍵、手機左右滑動（橫向位移 >70px 且明顯大於縱向才觸發，避免干擾上下捲動）
- **換天後的捲動位置**：回到「日期列貼齊畫面頂端」的位置（`navHomeY()`），
  **不要改回捲到頁面最上面** —— 使用者反映每換一天就要把頁首照片重看一次
  - 已經停在日期列上方（頁首還看得到）時**不捲動**，工具列的「複製這天行程」才不會被捲走
  - 瞬間跳過去、不做 smooth 動畫：內容已經整個換掉，捲動動畫只會讓新的一天從眼前刷過去
  - 日期列是 sticky，捲下去後量它自己永遠是 0，所以 `navHomeY()` 量的是前一個元素（航班列）的底邊
  - 第一次載入（`initDay()` 傳 `noScroll`）不主動捲動；網址帶 `#day-N` 時（從地圖頁「看這天的行程」
    連回來）交給瀏覽器原生的錨點捲動，`.day-section` 的 `scroll-margin-top: calc(var(--nav-h) + 16px)`
    讓它停在同一個位置。**沒有這個 margin，sticky 的日期列會蓋住當天標題**。
    `--nav-h` 由 `syncNavHeight()` 用 `getBoundingClientRect().height` 量 ——
    `offsetHeight` 會四捨五入（61.6 → 62），頂端會露出一條航班列
- **今日標記**：日期列上「今天」那一格右上角有金色圓點
- **航班列**：每一組的去回程各一行，組別與航空公司要標清楚（例：「🅰 〇〇組 去程 中華航空 CI104」）；航班取自 `trips/<id>/CLAUDE.md`
- **三種項目分類**：每個 `.timeline-item` 都必須有 `.tl-kind` 標示（`.claude/hooks/trip-hooks.js` 寫檔時檢查）
  - `.is-main` ＋ `主行程`：航班、住宿 check-in/out、已預約或使用者指定的項目（高速バス 0106、富士回遊 7 号、牛たんの檸檬、浅草牛かつ 分店）、報到與退房，
    以及大景點（例如高尾山、江の島、新倉山浅間公園、浅草寺）。左側為實線邊
  - `.is-move` ＋ `交通`：**所有移動與過關**。交通不是「行程」而是兩個行程之間的過程，
    所以獨立成一類，左側為灰色點線、標籤是灰字外框，讓視線可以直接跳過
  - `.is-flex` ＋ `彈性`：其餘餐飲、購物、機動景點。左側為虛線邊，內含方案輪播。
    **`.is-flex` 一定要有 `.plans`**（至少方案 A，地點放 `.map-link`）：沒有 `.plans` 的彈性卡 `build-places.js` 不當成一站，路線會斷在它前後。
    「自由時間｜」也照這樣給 2～4 個附近的選項（方案 A 是首選）；「晚餐各自處理」這種不給選項的，給**只有方案 A 的 `.plans`**，地點是大家散開的那一區（例：池袋駅東口），
    這樣前一段的交通（例：鎌倉 → 池袋）在地圖上才有終點。不要拿掉 `.map-link`：當天最後一張卡沒有地點，最後那段交通就畫不出來，rebuild 也不會報錯
  - 交通項目**不再另外掛 `.tl-tag.transport`「交通」pill**，那會和分類標籤重複顯示同一個字
- **方案輪播 `.plans`**：方案 A 一律是原訂行程（或首選），B～E 為替代方案
  - **挑選原則**（使用者明確要求，不要退回「每天都給同一批店」）：
    - **同一家店不要出現在不同天的方案裡**；每一組都要配合當天的星期（公休日）、所在區域與前後行程
    - 優先選評價高、有人氣的店：食べログ評分與評論數、百名店／食べログ Award，並參考近五年的
      部落客、論壇與社群評價 —— **五年以前的評價不採用**
    - 每一家都要確認「那天那個時段有開」，寫進卡片
    - 9 個人的席數、能否分桌與預約，要寫在 `⚠️ 注意`
  - **方案小卡 `.plan-ref`**：`.pr-name` 店名／`.pr-feat` 特色／`.pr-facts`
    （⭐ 食べログ評分與評論數＋查詢年月、🏅 百名店／Award、🕐 營業時間、🎫 價位、📍 地址、⚠️ 注意）／
    `.pr-links`（`.pr-map` 地圖＋`.pr-src` 查證來源）。評分會隨時間變動，**一定要寫查詢年月**
  - 切換方式：圓點、左右箭頭、**區塊內左右滑動**（門檻 40px）、桌機滑鼠拖曳
  - **切換方式是 display 顯示／隱藏，不要改回 transform + 量高度。**
    非 active 的方案為 `display:none`，容器高度自然貼合目前那一張。
    曾因為 `initPlans()` 在 `initDay()` 之前執行、當下所有 `.day-section` 都是
    `display:none`，量到的 `offsetHeight` 為 0，導致容器高度被鎖成 0px、內容全被裁掉
  - **導覽列 `.plans-nav` 必須在輪播「上方」，不要搬回下方。**
    A／B／C 的內容長度差到 224px，導覽列放下方時換一次方案整排按鈕就上下跳
    84～230px，而按鈕只有 26px 高 —— 桌機連點兩次「›」第二下必定落空，
    使用者看到的就是「網頁版根本不能切換」
  - **每個方案自己帶標題與 emoji**：`.plan` 上的 `data-icon`，以及 `.plan` 內第一個
    `<span class="plan-title" hidden>`。`go()` 會把它們寫進 `.tl-title`／`.tl-icon`，
    並更新 header 上的 `.tl-plan` 指示（A 用主色、B～E 用次色）。
    **不可以只換內文不換標題** —— 否則會出現「標題寫甲店、內容是乙店」。每個方案都要有 `.plan-title`（`.claude/hooks/trip-hooks.js` 寫檔時檢查）。
    方案 A 的 `plan-title` 就是原本的標題（含 `.ja-name`）；B～E 只寫繁中（店名依「餐廳挑選的規則」），
    未經查證的日文寫法一律不寫
  - `go()` 會把導覽列**釘回原本的螢幕位置**：方案長短不同會改變整份文件的高度，
    使用者若正捲在頁尾，瀏覽器會夾住捲動位置、整頁往下位移。捲不動時會撐開
    `.scroll-slack`（頁尾臨時墊片）補回距離，使用者一捲動就收掉
  - **頁面層級的日期滑動會略過起點落在 `.plans` 或 `.spot-photos` 內的手勢**，兩種滑動才不會打架
  - 方案中引用的店家／景點資料一律來自已查證的資料（`trips/<trip>/reference/` 的查證筆記、`trips/<trip>/attractions.json`），
    **不要在方案裡手寫未查證的票價或營業時間**
  - 列印時所有方案會攤平顯示（連同各自的標題），不會只印出目前那一個
- **主行程的計畫B `.alt-plan`**：主行程描述裡原本用一句「計畫B：…」帶過的備案，
  改成主行程卡片底部的收合區塊
  - **不做成方案輪播**：輪播代表「任選一個」而且會換掉標題；主行程是已訂或非去不可，計畫B 只是備案
  - `<details class="alt-plan">`：收合時一列寫明「B｜計畫B｜名稱」＋什麼情況用（`.ap-when`），
    點開才看 `.plan-ref` 小卡。B 字方塊直接用 `.plan-tag`，虛線框與顏色沿用次色＝替代方案
  - 小卡裡的地圖連結用 `.pr-map`，**不要用 `.map-link`**（`.claude/hooks/trip-hooks.js` 寫檔時檢查） —— 否則 `build-places.js` 會把它當成
    行程地點畫上地圖、串進當天的移動路線
  - 內容一樣只能引用已查證的資料
  - 列印時由 `beforeprint` 全部展開、`afterprint` 還原；`copyDay()` 會在該項下面多一行「└ 計畫B｜…」
- **交通卡標題的站名加淡色底 `.stn`**（使用者 2026-11-13）：itinerary.js 載入時自動處理 `.timeline-item.is-move .tl-title`，把「路線｜A 14:12 → B 約 14:28」裡「→」隔開的每一段拆成站名＋時間或備註，站名包成 `<span class="stn">`；路線名（結尾是 線、ライン、号、特急、Skyliner）不包，「新宿 10 番線」只包「新宿」，標題後面的 `.ja-name` 原樣保留。HTML 不用手動標；寫新交通卡時標題照「路線｜起站 時間 → 迄站 時間」的格式就會套用。樣式在 itinerary.css（淡色底、圓角、不加框，深色模式用 `--chip-bg`）。只做標題，內文的站名不標。
- **導遊型交通指引**：交通卡片裡「導遊型交通指引：」＋ `<ol>`，每一步一個 `<li>`
  - **彈性方案也要有自己的指引**：`.plan-body` 裡的 `.plan-route`（`.plan-route-title`「🧭 導遊型交通指引」＋ `<ol>`，
    只有一步時用 `<p class="plan-route-step">`，補充的另一種走法放 `.plan-route-note`），寫「從前一站怎麼到這個方案」。
    有前一張交通卡時寫成「照上一張交通卡到〇〇站，往〇步行約 N 分鐘」；更好的走法不經過那張卡時寫「不走上一張交通卡：…」
  - **可以不寫的情況**（使用者訂的規則）：前一張交通卡已經寫過同樣的走法；或這個方案離方案 A 走路 3 分鐘以內
  - 車程、票價用 Yahoo!路線情報查當天同時段的班次（頁面禁止轉載，只記事實與網址在筆記裡）；
    步行時間用 OSRM 算（`routing.openstreetmap.de`，步行以 80 m／分換算），店家座標取食べログ地圖頁，不要用 Nominatim 查店名；
    沒有數字的距離寫「約 N 分（估算）」
  - **山手線方向不要寫反**，寫之前對 relation 的站序：內回り（1972960）是 日暮里 → 池袋、池袋 → 新宿、上野 → 駒込；外回り（1972920）是 新宿 → 池袋、駒込 → 上野。
    注意 `osm_relations_關東.md` 的「池袋 → 新宿：外回り」「上野 → 駒込：外回り」兩句與它自己列的站序相反（站序和行程規格才是對的），用那份筆記時不要照抄這兩句
- **景點卡片裡的順路清單 `ul.spot-route`**：**不要用 `<ol>`**（`.claude/hooks/trip-hooks.js` 寫檔時檢查） ——
  「1. 14:50 某處」序號後面緊接時間很難讀（使用者反映）。改成圓點清單，時間放在 `.sr-time`（主色粗體）
- **景點卡片的照片與小地圖 `.spot-media`**：
  - 一個景點一個 `trips/<trip>/spots/<id>.json`：`stops`（停留點：名稱、日文、時間、座標、一句說明）與
    `photos`（`cat` Commons 分類／`q` 全文搜尋／`pick` 選定的檔名）；沒做小地圖的景點不用建檔
  - 照片：`docs/<trip>/spots/<id>/`，**和頁首照片同一套標準**（Wikimedia Commons 自由授權、
    EXIF 拍攝日期在 2021-11-07 之後、橫式；卡片是 4:3 小圖，原圖寬 ≥ 1920px 即可），下載 960px：
    ```bash
    node scripts/fetch-spot-photos.js <id> --trip 2026-11 --candidates   # 依標準搜尋候選
    node scripts/fetch-spot-photos.js <id> --trip 2026-11                # 下載 pick 的照片與 credits.json
    ```
  - **一定要用眼睛看過再填 `pick`**（作法：把候選縮圖拼成一張總覽圖再看）；搜尋結果會混進同名的別處，也會有角落壓了拍攝日期浮水印的手機快照，不要用
  - **分類（`cat`）比全文搜尋準**，但小地點的分類裡常常沒有近五年的照片 —— 這時改拍同一條順路上的其他重點，**不要放寬標準**；
    沒收的原因寫進 `photoNote`
  - 作者與授權寫在每張照片下方，來源記在 `credits.json`；`loading="lazy"`
  - 小地圖：`<iframe src="../map/spot.html?id=<id>&embed=1" loading="lazy">`。Leaflet 只在 spot.html 載入，
    行程表本身不載入。停留點的**座標要自己查證**（Nominatim 對寺社的細部名稱常給同名的別處），
    `node scripts/build-spots.js --trip <trip>` 用 OSRM 算步行路線寫入 `docs/<trip>/map/spots/<id>.js`（**不要手動編輯**；分鐘＝距離 ÷ 80，`rebuild.js` 也會跑）
  - 大景點的園內路線＋必看點照片＋詳細說明：用 `spot-guide` skill，寫在這趟的攻略頁 `docs/<trip>/guide/index.html`，`build-guide.js` 拆成單頁 `guide/<id>.html`（卡片連到單頁）
  - iframe 在那一天還沒顯示時尺寸是 0，spot.html 會在尺寸改變時重新 `fitBounds`；離線時隱藏地圖、顯示提示
  - 禁止轉載的官網**不存整頁副本**，只存 `網域_查證筆記.md`（見 `web-crawler` skill）
- **複製這天行程**：`copyDay()` 匯出純文字（含日文地名）貼給旅伴；Clipboard API 失敗時退回 `execCommand`
- **餐飲建議收合 `.is-suggest`**（使用者 2026-11-08 要求）：**AI 自己挑的**早餐／午餐／晚餐／宵夜彈性卡；
  使用者清單上的店、已訂位的店**不加**（收合會把家人自己的清單藏起來；2026-11 整趟只有 2 張 AI 挑的加了），
  卡片 class 加 `is-suggest`，`initSuggest()` 會補上「💡 建議」標籤與收合列（`.sugg-toggle`，寫著「N 個建議（A：店名），點開看」）
  - 預設 `is-collapsed`：隱藏 `.plans`、`.tl-tips`、卡片本體的 `.map-link`；標題仍顯示目前方案（`go()` 照寫）
  - 點收合列或標題列切換；工具列 `#suggToggle`「💡 展開建議／收起建議」一次切換當天全部（不存 localStorage）
  - 列印：`beforeprint` 全部展開、`afterprint` 還原；`copyDay()` 不受影響
  - 「自由時間｜」「上野的下午｜」不是餐飲，**不加** `is-suggest`；不影響 `build-places.js`
- **分頭行動 `.split`（A 線／B 線，兩條線）**：寫法見 `trips/_template/itinerary-snippets.html`
  - `.split` 放在 `.timeline` 裡，和一般項目同一層：`.split-head`（🔀 分頭行動、時段、會合點）、`.split-tabs`、`.split-lanes` 裡兩個
    `.lane`（`data-who="family"`／`"solo"`），各自放一般的時間軸項目；**每個 `.lane` 結尾一定要接 `<!-- /lane -->`**（`build-places.js` 靠它分地點屬於哪一條線，
    少了會直接報錯）。還沒排的那條線先放 `.lane-empty` 佔位
  - `data-who="family"`＝🅰 A 線、`"solo"`＝🅱 B 線（程式裡的 `LANE_NAME`、工具列文字與地圖時間標籤已經是 🅰／🅱，內部值 `family`／`solo` 不改）。
    `.lane-label` 與分頁按鈕寫「🅰 組別名稱」：組別名稱見 `trips/<id>/CLAUDE.md`「分頭行動」
  - 頁面上有 `.split` 才會在工具列加「👥 看：全部／🅰 看：A 線／🅱 看：B 線」（`cycleWho()`，存在 `TRIP.key('who')`，地圖頁讀同一個值），
    日期列那天左上角加 🔀
  - 看全部：寬螢幕（≥ 900px）兩條線並排、各自標名稱；手機用區塊裡的分頁切換（只切這一塊）。只看一個人：只留那一條線，分頁變成切換看誰
  - `copyDay()`：看全部時列出兩條線並標〔A 線〕〔B 線〕；只看一條線時只複製那條線。列印時兩條線都印
  - 地圖：地點帶 `who`，時間標籤後面加 🅰／🅱；看全部時兩條線都畫路線（共同的點兩串都有）。`routes.json` 兩條線有同一個時間時，區段加 `"who"`
- **日期列置中**：`.day-nav-inner` 用 `width: fit-content` + `margin: 0 auto` 達成寬螢幕置中；`min-width: max-content` 會讓 `justify-content` 失效，**不要改回去**。560px 以下改為靠左並可橫向捲動
  - `.tip.warn` — **會撲空／會關門的警告**（例如 11/16 江の島沒有點燈、11/21 六義園沒有點燈）
  - `.tip.book` — 需預約、有時限
  - `.tip.near` — 附近推薦、替代方案
  - `.tip.info` — 營業時間、交通等實務資訊
- **日文地名**：`.ja-name` 標註日文寫法，僅在繁中與日文寫法不同時才加；切換狀態存於 localStorage `showJa`；**列印時一律顯示**，方便在當地出示給站務人員
- **主題**：自動／淺色／深色三段循環，存於 localStorage `theme`
- **預算追蹤已移出本頁**，改為獨立的 `docs/<trip>/budget/`（依 Day 分開記帳，localStorage `budget2.*`）
- **離線**：Service Worker 快取行程本體；字體採非阻塞載入，CDN 失效時退回系統中日文字型
  - `docs/sw.js` 對同源請求一律 **network-first**（見檔案內註解），`CACHE` 版本號由 Stop hook 跑 `scripts/rebuild.js` 時自動 +1；新增頁面或共用檔時要加進 `PRECACHE`
  - 頁面另外監聽 `controllerchange`，**新版 SW 接手後會自動重新整理一次**。
    沒有這段的話，改版當下已開著舊頁面的人會停在「新 HTML ＋ 舊 CSS／JS」的半舊狀態
- **地圖連結**：中國的那幾趟（`TRIP.maps = 'amap'`）也照樣寫 `maps.google.com/maps?q=`，`itinerary.js` 打開時換成高德，`?q=` 要加城市名（`reference/regions/china.md`）
  - `?q=` 一律使用**明文的當地地名**（日本用日文），不要改回 percent-encoding（`.claude/hooks/trip-hooks.js` 寫檔時檢查）（歷史上曾因編碼轉換導致 17 個連結指向錯誤地點）
  - 方案小卡的 `.pr-map` 也一樣；店名取查證過的正式名稱（筆記裡只有英文名的就用英文名，見 `.claude/rules/planning.md`「餐廳」），
    不要用「店名＋分類欄位」拼出查不到的字串

