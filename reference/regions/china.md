# 中國的查證方法

去中國的那幾趟自己讀。2026-11-19 在成都實測過。

## 地圖連結用高德
- 這趟的 `docs/<id>/trip.js` 寫 `maps: 'amap'`，`trips/<id>/coords.json` 寫 `"country": "cn"`（新的一趟從範本改）
- 行程表的連結**照樣寫** `https://maps.google.com/maps?q=明文地名`：`build-places.js` 靠這個格式抓地點、hook 也照這個格式檢查；
  `itinerary.js` 在網頁打開時換成高德的關鍵字搜尋（`uri.amap.com/search?keyword=…`），地圖頁、景點小地圖的彈窗用座標開高德（`uri.amap.com/marker`）
- **座標偏移**：我們的座標是 WGS84（Nominatim／OSM），高德用 GCJ-02。開 marker 一定要帶 `coordinate=wgs84`（程式已處理）；
  寬窄巷子實測換算前後差約 359 m。不要把高德 App 上複製的座標直接填進 `coords.json`：那是 GCJ-02，在 OSM 底圖上會偏同樣的距離
- `callnative=1`：手機上嘗試打開高德 App
- 高德的 Web 服務 API（地理編碼、路徑規劃）要 key，不帶會回 `INVALID_USER_KEY`；查座標、步行時間照舊用 Nominatim、OSRM
- 高德**桌面版**（ditu.amap.com/dir）的路線規劃要登入（掃碼或簡訊），還會跳滑塊驗證（2026-11-19、11-20 實測）。不要嘗試繞過
- 高德**手機網頁版**不用登入就能查大眾運輸（2026-11-20 實測）：Playwright 用 iPhone 的 User-Agent（`isMobile: true`）開
  `https://uri.amap.com/navigation?from=經度,緯度,名稱&to=經度,緯度,名稱&mode=bus&callnative=0` → 會轉到 `m.amap.com/navigation/buslist/…`，列出線路、站數、票價、門到門時間、步行合計、進站口、計程車估價
  - 座標要 **GCJ-02**：WGS84 先換算（標準公式）；這頁不吃 `coordinate=wgs84`
  - 分段（步行幾公尺幾分、哪個出口、方向、轉乘分鐘）：在列表點方案 → 地圖頁點「详情」。直接開 `busdetail/` 網址不會載入
  - 只能查「現在」的方案（沒有出發時間選項）；計程車時間含查詢當下路況；首末班、班距沒顯示
  - 起訖點太近時會直接跳步行路線（`walkmap/`），也有用：高德步行有算坡、梯，重慶比 OSRM 準
  - **不要直接呼叫頁面背後的 `service/navigation/*.json`**（權限會擋，也不該這樣用）；只讀畫面上的文字
  - 例子與結果：`trips/2026-12/reference/m.amap.com_交通_查證筆記.md`

## 地名
- `?q=` **一律加城市名**（例：`春熙路 成都`）：只查「春熙路」，Nominatim 會給深圳的春熙路；高德的關鍵字搜尋也一樣靠它定位
- Nominatim 用繁體字也查得到（寬窄巷子、成都大熊貓繁育研究基地），回傳的名稱是簡體
- 地鐵站名用 OSM 上的簡體寫法；成都地鐵 1、2、3、4、7、10 號線都有 route relation（例：2 號線 2474349 犀浦 → 龙泉驿、8298109 反方向）。
  Overpass 常回空的或逾時，換一台或重試

## 餐廳評分用大眾點評（2026-11 實測）
- curl、WebFetch 只拿到空殼；Playwright 沒登入會被導到 `verify.meituan.com`（反爬驗證頁）。**不要嘗試繞過驗證**（自動解滑塊、偽裝指紋、逆向簽章都不做），遇到就停下來請使用者處理
- 可行的做法：使用者在 Playwright 開的瀏覽器**自己登入**後，一頁一頁讀，只查要用的店，不大量翻頁
- 搜尋頁 `https://www.dianping.com/search/keyword/<城市>/0_<店名 區域>`（成都 = 8）：店名、評價數、人均、分店連結；搜到 0 筆或只出別的分店 → 可能已關，和其他來源衝突要記
- 商戶頁 `https://www.dianping.com/shop/<id>` 表頭是純文字：總分、評價數、人均、口味／環境／服務、榜單、營業時間、地址、最近地鐵出口；**公休日不寫**，要另外查
- 等級寫「點評官方頁面（原文）」並附商戶網址；不存網頁備份

## 參考來源
- 高德 URI API 單點標註（`coordinate`、`callnative` 參數）：https://lbs.amap.com/api/uri-api/guide/mobile-web/point
- WGS84 座標直接給高德會偏移的例子：https://blog.csdn.net/iotjin/article/details/103287740
