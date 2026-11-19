/* 東京秋季家族之旅E2E（2026-11-14～11-22）的設定。
 * 這趟各頁共用的程式（docs/assets/*.js）靠 window.TRIP 分辨是哪一趟。
 */
window.TRIP = {
  id: '2099-11',
  name: '東京秋季家族之旅E2E',
  /* localStorage 的 key 前面加上這趟的 id：記帳、勾選、地圖方案各趟分開存 */
  key: function (k) { return '2099-11:' + k; }
};
