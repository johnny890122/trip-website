/* 離線快取：每一頁都載入這支，註冊網站根目錄的 sw.js（範圍是整個網站）。 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var swUrl = new URL('../sw.js', document.currentScript.src).href;
  var scope = new URL('./', swUrl).href;
  window.addEventListener('load', function () {
    /* 新版 Service Worker 接手後自動重新整理一次，避免「新 HTML ＋ 舊 CSS / JS」。
       第一次安裝時本來就會換手，那次不需要重載。 */
    var hadController = !!navigator.serviceWorker.controller;
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
    /* 舊版只管 final/ 的 Service Worker 要先移除，不然它會繼續蓋過根目錄這支 */
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { if (r.scope !== scope && r.scope.indexOf(scope) === 0) r.unregister(); });
    }).catch(function () {});
    navigator.serviceWorker.register(swUrl).catch(function () { /* 離線快取失敗不影響閱讀 */ });
  });
})();
