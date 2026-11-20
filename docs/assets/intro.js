/* 地區簡介頁的狀態篩選：按鈕切換 body[data-f]，intro.css 依此隱藏卡片。不存 localStorage。 */
(function () {
  var btns = document.querySelectorAll('.in-filter');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      if (b.dataset.f === 'all') document.body.removeAttribute('data-f');
      else document.body.setAttribute('data-f', b.dataset.f);
    });
  });
})();
