# 日本：查證方法與踩過的坑

去日本的那幾趟才需要讀這份。通用規則在根目錄 `CLAUDE.md`。
內容來自 2026-11 東京那趟（查證日期 2026-11-07～15），網站行為可能改變，用之前先確認。
`japan/` 是更早一趟（2026-10，原作者）的 Check List 原始頁面備份：入境、藥品、電壓、公廁、緊急電話等，日本通用，新的一趟可以當起點再查一次。

## 餐廳：食べログ
- **用英文站 `tabelog.com/en`**：英文站可讀，日文站在查證環境會回 403；`ssl.tabelog.com/en/…` 解析不到（ENOTFOUND），筆記與卡片的網址一律寫 `https://tabelog.com/en/…`
- 評分、評論數一律寫「YYYY/MM 查」；百名店、食べログ Award 寫在 `🏅`
- **日文店名沒查證的只寫英文站上的名稱**（可註明「食べログ英文站名稱」），不要自己猜日文；只有使用者指定、筆記裡寫了日文店名的才寫日文
- 店家座標取各店地圖頁 `…/dtlmap/` 的 `center=緯度,經度`（可與店頁 JSON-LD 的 geo 欄位交叉比對），寫進 `trips/<id>/coords.json` 的 `plans`；**不要用 Nominatim 查店名**。
  `center=` 在 HTML 裡的靜態地圖圖片網址，WebFetch 轉成文字後會不見（看起來像「只有圖片地圖」）；用 Bash 抓：
  `curl -s -A "Mozilla/5.0" https://tabelog.com/en/<…>/dtlmap/ | grep -o 'center=[0-9.,]*' | head -1`
- 爬蟲預設的內文擷取在食べログ只會存到頁首選單（約 245 bytes），要覆寫 `extract_content()` 直接回傳 `soup.body`

## 座標
- **Nominatim 對日本地址只到「丁目」中心**，步行路線會差一兩百公尺。住宿、已訂的店等要精確位置的，用國土地理院「地址檢索」
  `https://msearch.gsi.go.jp/address-search/AddressSearch?q=地址` 取門牌座標，寫進 `coords.json` 的 `fixed`
- Nominatim 常把寺社、車站的細部名稱查成同名的別處（例：今戸神社 → 群馬縣前橋、豪徳寺 → 豪徳寺一丁目），查到後一定要核對回傳的地址；錯的寫進 `override`
- 郵遞區號可用 zipcloud 確認

## 交通
- **Yahoo!路線情報**：查當天同時段的班次、車程、票價；**頁面禁止轉載**，只記事實與網址在 `網域_查證筆記.md`，不存整頁副本
- **JR 東日本官網（jreast.co.jp、eki-net.com）在查證環境回 403**；但**站別時刻表 `timetables.jreast.co.jp/<YYMM>/timetable-v/<站碼><方向>.html` 讀得到**（2026-11 E2E 確認，可查到列車號與到站時間）。票價只能靠 ekitan、Yahoo!路線情報與搜尋摘要，卡片上註明、出發前再看官網
- 動態網頁（JavaScript 才有內容的官網，例如部分航空公司）只記成 `*_查證筆記.md`
- **OSM 站名寫法**：不加「駅」；有副站名的照 OSM（例：副都心線「明治神宮前〈原宿〉」）；relation 裡的站名可能有錯字（例：京王線 11271039 的「下高井」），要對過站序
- **山手線方向不要寫反**：內回り（relation 1972960）是 日暮里 → 池袋 → 新宿、上野 → 駒込；外回り（1972920）是 新宿 → 池袋、駒込 → 上野。
  `trips/2026-11/reference/osm_relations_關東.md` 有兩句「池袋 → 新宿：外回り」「上野 → 駒込：外回り」和它自己列的站序相反，以站序為準
- 都市內的地鐵、山手線班距短，不寫死班次；JR 中距離、指定席特急、私鐵支線、地方公車要寫「一定要搭的那一班」
- 地方的周遊巴士常常在 OSM 沒有 route relation，用 `{ "mode": "car" }` 畫
- **地方公車、巴士的末班車**：業者的時刻表頁常常 404 或是圖片 PDF；找不到時改找**町公所、觀光協會的傳單**（官方 PDF），還是找不到就寫「未查到」並列進出發前要查的清單，不要用班距推算末班
- 2026-11 用過、讀得到的交通官方頁（網址格式可能變，先試這些）：
  - 京成 Skyliner 時刻表：`keisei.co.jp/keisei/tetudou/skyliner/us/traffic/skyliner_1101.php`（分平日／土休日表）
  - 富士回遊：`jr-group.jp/fujikaiyu-timetable/`
  - 富士急行線 站別時刻表：`fujikyu-railway.jp/station/timetable.php?no=<站號>`
  - 富士急巴士 河口湖周遊バス：`bus.fujikyu.co.jp/rosen/shuyuomuni`；高速巴士各線：`bus.fujikyu.co.jp/highway/detail/id/<N>`

## 公開資料來源
- **日落時刻**：國立天文台 暦計算室（`eco.mtk.nao.ac.jp`），網址的 `s1311` 之類是地點清單的順序，**不是縣碼**（例：s1311＝東京、s1511＝横浜、s2011＝甲府）
- **天氣**：氣象廳 1991～2020 年平年值（`data.jma.go.jp/obd/stats/etrn/view/nml_sfc_ym.php`，依觀測站的 `prec_no`／`block_no`）
- **預報**：tenki.jp 10 日間，網址 `https://tenki.jp/forecast/<地方>/<都道府県>/<地域>/<市區町村代碼>/10days.html`（例：台東区 `3/16/4410/13106`、富士河口湖町 `3/22/4920/19430`）；
  代碼不知道時從 `https://tenki.jp/forecast/<地方>/<都道府県>/` 的地點清單找。用 curl 抓 HTML：
  `curl -s -A "Mozilla/5.0" <網址> | grep -o 'class="days">[^<]*\|class="prob-precip">[0-9-]*%\?<\|[0-9]*日[0-9:]*発表'`（日期、每天的降水機率、發表時間）
- **急難救助**：台北駐日經濟文化代表處的號碼取自外交部領事事務局頁面（roc-taiwan.org 本站要執行 JavaScript，讀不到）；公開機關電話可以寫

## 已知會變動的規定（2026-11 查，每一趟都要重查）
- **免稅**：2026/11/1 起改「リファンド方式」：結帳先付含稅價，出境時在機場海關確認後退稅，託運行李前要先過海關
- **行動電源**：日本國交省 2026/4/24 起每人最多 2 個、只能隨身、機上禁用禁充（台灣民航局 2026/4/8 起同樣規定）
- **藥品**：自用數量有上限，含偽麻黃鹼超過 10% 的屬覺醒劑原料
- 來源都在 `trips/2026-11/reference/checklist_查證筆記.md`
