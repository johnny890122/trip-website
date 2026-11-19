/* 成都之旅（2026-12-08～12-18）的設定。
 * 這趟各頁共用的程式（docs/assets/*.js）靠 window.TRIP 分辨是哪一趟。
 */
window.TRIP = {
  id: '2026-12',
  name: '成都之旅',
  /* 地圖連結用高德（中國）；沒寫就是 Google Maps */
  maps: 'amap',
  /* localStorage 的 key 前面加上這趟的 id：記帳、勾選、地圖方案各趟分開存 */
  key: function (k) { return '2026-12:' + k; }
};
