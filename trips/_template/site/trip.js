/* 〔旅行名稱〕（〔YYYY-MM-DD〕～〔MM-DD〕）的設定。
 * 這趟各頁共用的程式（docs/assets/*.js）靠 window.TRIP 分辨是哪一趟。
 */
window.TRIP = {
  id: '〔YYYY-MM〕',
  name: '〔旅行名稱〕',
  /* localStorage 的 key 前面加上這趟的 id：記帳、勾選、地圖方案各趟分開存 */
  key: function (k) { return '〔YYYY-MM〕:' + k; }
};
