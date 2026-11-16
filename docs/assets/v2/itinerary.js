/* 新版介面：行程表（final、simple 共用）
 * 只補外觀需要的小東西，舊版 docs/assets/itinerary.js 的功能都不動：
 *   1. 交通卡的「交通」標籤改寫成交通方式（依卡片圖示）
 *   2. 主行程標籤顯示成「必去」，圖例一起改
 *   3. 換日期後，日期列停在固定選單下面；選到的日期捲進日期列看得到的範圍
 */
(function () {
  /* 圖示 → [標籤文字, 顏色分組]。只列行程表裡交通卡實際用到的圖示；
     沒列的（🚗 前往機場、🛃 入境通關）維持原本的「交通」 */
  var MODES = {
    '🚃': ['電車', 'rail'],
    '🚇': ['電車', 'rail'],   // 這個圖示在行程表裡也用在 JR 山手線的卡片，所以不寫「地鐵」
    '🚄': ['特急', 'rail'],
    '🚝': ['單軌', 'rail'],
    '🚶': ['步行', 'walk'],
    '🚌': ['巴士', 'bus'],
    '🚡': ['纜車', 'cable'],
    '🚕': ['計程車', 'taxi']
  };

  function each(sel, fn, root) {
    Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn);
  }

  /* 1. 交通方式標籤 */
  each('.timeline-item.is-move', function (item) {
    var icon = item.querySelector('.tl-icon');
    var kind = item.querySelector('.tl-kind.move');
    if (!icon || !kind) return;
    var mode = MODES[icon.textContent.replace(/️/g, '').trim()];
    if (!mode) return;
    kind.textContent = mode[0];
    kind.setAttribute('data-mode', mode[1]);
  });

  /* 2. 主行程 → 必去 */
  each('.timeline-item.is-main .tl-kind.main', function (el) { el.textContent = '必去'; });

  var LEGEND = [['主行程', 'main', '必去'], ['交通', 'move', '交通'], ['彈性', 'flex', '彈性']];
  each('.kind-legend > span', function (span) {
    var text = span.textContent;
    for (var i = 0; i < LEGEND.length; i++) {
      var at = text.indexOf(LEGEND[i][0] + '＝');
      if (at < 0) continue;
      var tag = document.createElement('i');
      tag.className = 'tl-kind ' + LEGEND[i][1];
      tag.textContent = LEGEND[i][2];
      span.textContent = text.slice(at + LEGEND[i][0].length + 1);
      span.insertBefore(tag, span.firstChild);
      return;
    }
  });

  /* 3. 換日期後的位置 */
  var nav = document.getElementById('dayNav');
  var oldShowDay = window.showDay;
  if (!nav || typeof oldShowDay !== 'function') return;

  function menuHeight() {
    var menu = document.querySelector('.v2-menu');
    return menu ? menu.getBoundingClientRect().height : 0;
  }

  /* 選到的日期捲到日期列中間（只動日期列自己的橫向捲動，瞬間到位） */
  function centerTab() {
    var btn = nav.querySelector('button.active');
    if (!btn) return;
    var n = nav.getBoundingClientRect(), b = btn.getBoundingClientRect();
    nav.scrollLeft += b.left - n.left - (n.width - b.width) / 2;
  }

  /* 舊版把日期列捲到畫面最上面；新版上面多一條固定選單，要少捲一個選單的高度 */
  window.showDay = function (n, opts) {
    var before = window.scrollY;
    oldShowDay(n, opts);
    centerTab();
    if (opts && opts.noScroll) return;
    var prev = nav.previousElementSibling;
    if (!prev) return;
    var home = Math.ceil(prev.getBoundingClientRect().bottom + window.scrollY - menuHeight());
    if (before > home) {
      var root = document.documentElement;
      var keep = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, home);
      root.style.scrollBehavior = keep;
    }
  };

  centerTab();
})();
