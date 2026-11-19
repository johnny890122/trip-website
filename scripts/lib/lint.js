/* 行程表頁面的格式檢查：.claude/hooks/trip-hooks.js（寫檔當下）與 scripts/rebuild.js（重建前）共用。
 * rebuild.js 也跑一次，是因為用 Bash（python、sed）寫的檔不會經過 hook。 */
function lintHtml(h, banned = []) {
  const errs = [];
  const n = (re) => (h.match(re) || []).length;
  const items = n(/class="timeline-item[ "]/g), kinds = n(/class="tl-kind /g);
  if (items !== kinds) errs.push(items + ' 個 .timeline-item 但只有 ' + kinds + ' 個 .tl-kind：每一項都要標主行程／交通／彈性');
  if (/maps\?q=[^"]*%[0-9A-Fa-f]{2}/.test(h)) errs.push('Google Maps 連結的 ?q= 要用明文地名，不要 percent-encoding');
  if ([...h.matchAll(/<details class="alt-plan">[\s\S]*?<\/details>/g)].some((m) => m[0].includes('class="map-link"'))) {
    errs.push('計畫B（.alt-plan）裡的地圖連結要用 .pr-map，不要用 .map-link（會被畫上地圖、串進路線）');
  }
  if (/<ol class="spot-route/.test(h)) errs.push('順路清單 .spot-route 要用 <ul>，不要用 <ol>');
  const plans = n(/<div class="plan( is-active)?" data-i="/g), titles = n(/<span class="plan-title" hidden>/g);
  if (plans !== titles) errs.push(plans + ' 個方案但只有 ' + titles + ' 個 .plan-title：每個方案都要自己帶標題');
  const badTimes = [...h.matchAll(/<span class="tl-time">([^<]*)<\/span>/g)].map((m) => m[1]).filter((t) => t.trim() && !/^\d{2}:\d{2}$/.test(t.trim()));
  if (badTimes.length) errs.push('.tl-time 只能寫 HH:MM（routes.json 的 key）：' + badTimes.join('、') + '；「約」「估算」寫在標題或內文');
  const lanes = n(/<div class="lane" data-who=/g), laneEnds = n(/<!-- \/lane -->/g);
  if (lanes !== laneEnds) errs.push(lanes + ' 個分頭行動 .lane 但只有 ' + laneEnds + ' 個 <!-- /lane -->：每個 .lane 結尾都要接（build-places.js 靠它分地點）');
  const ids = [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dup.length) errs.push('重複的 id：' + dup.join('、') + '（同一塊被插入兩次？例如航班列、日期導覽列）');
  for (const { re, why } of banned) {
    const hits = [...h.replace(/<[^>]+>/g, '').matchAll(new RegExp(re.source, 'g'))].map((m) => m[0]);
    if (hits.length) errs.push('「' + [...new Set(hits)].join('」「') + '」共 ' + hits.length + ' 處：' + why + '（trips/<id>/CLAUDE.md「網站不寫的字」）');
  }
  return errs;
}

/* 這趟不准出現在網站上的字：trips/<id>/CLAUDE.md 的「## 網站不寫的字」底下，每行 - `正規表示式` 理由 */
function bannedFor(root, id) {
  let md = '';
  try { md = require('fs').readFileSync(require('path').join(root, 'trips', id, 'CLAUDE.md'), 'utf8'); } catch { return []; }
  const sec = (md.split(/^## 網站不寫的字\s*$/m)[1] || '').split(/^## /m)[0];
  return [...sec.matchAll(/^- `([^`]+)`\s*(.*)$/gm)].map((m) => ({ re: new RegExp(m[1]), why: m[2] || '這趟的規則' }));
}

module.exports = { lintHtml, bannedFor };
