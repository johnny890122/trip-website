/* 新版介面共用程式 */
(function () {
  var root = document.documentElement;
  // 新版只用淺色底：舊程式切換主題時會改 data-theme，這裡固定回 light
  function light() { if (root.getAttribute('data-theme') !== 'light') root.setAttribute('data-theme', 'light'); }
  light();
  new MutationObserver(light).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // 選單太長時，把目前這一頁捲到看得到的位置
  var here = document.querySelector('.v2-menu a.is-here');
  if (here && here.scrollIntoView) here.scrollIntoView({ block: 'nearest', inline: 'center' });
})();
