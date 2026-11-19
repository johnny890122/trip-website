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
- 高德網頁版（amap.com/dir）的路線規劃要登入；Playwright 開的瀏覽器（無頭或有畫面、用使用者登入過的設定檔都一樣）會跳滑塊驗證，使用者手動拉也「驗證失敗」（2026-11-19 實測）。不要嘗試繞過；地鐵、公車的實際時間請使用者用高德 App 查，或標「估算」

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
