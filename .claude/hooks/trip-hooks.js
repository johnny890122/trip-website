#!/usr/bin/env node
/* 這個 repo 的 Claude Code hooks（設定在 .claude/settings.json）。把原本寫在 rule 裡、靠 Claude 記得的事，改成自動檢查：
 *
 *   pre   PreToolUse  Edit|Write|MultiEdit
 *         - 腳本產生的檔案（docs/v2/、docs/<id>/map/*.json、docs/<id>/hero/）不准手改 → deny
 *         - 改 docs/<id>/ 之前，這個 session 要先讀過 trips/<id>/CLAUDE.md → deny 並說明
 *         - 新加的電話、email、訂位代號、密碼 → ask（使用者確認後才寫）
 *   post  PostToolUse Read|Edit|Write|MultiEdit
 *         - 碰過 trips/<id>/ 的檔案 → 記下「這趟的 CLAUDE.md 已載入」
 *         - 改了 docs/<id>/ 或 trips/<id>/ 的地圖設定 → 記下「這趟要重建」
 *         - 行程表格式檢查、json 能不能解析 → 不過就 exit 2，Claude 會看到並修正
 *   bash  PreToolUse  Bash
 *         - 用腳本寫 docs/<id>/、trips/<id>/ 的檔（會跳過上面的檢查）→ deny，請改用 Edit／Write
 *   stop  Stop：有要重建的就跑 scripts/rebuild.js；失敗 exit 2 讓 Claude 修（第二次停下時不再擋，避免迴圈）
 *   reset SessionStart：清掉這個 session 的記錄（compact 之後 context 不在了，要重讀）
 *
 * 自我檢查：node .claude/hooks/trip-hooks.js test
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, 'scripts', '.cache');   // 已在 .gitignore
const TRIP = /^(?:docs\/(?:v2\/)?|trips\/)(\d{4}-\d{2})\//;
const GENERATED = [/^docs\/v2\//, /^docs\/[^/]+\/map\/(places|routes)\.json$/, /^docs\/[^/]+\/map\/spots\//, /^docs\/[^/]+\/hero\//,
  /^docs\/[^/]+\/guide\/(?!index\.html$)[^/]+\.html$/,   // 攻略單頁由 build-guide.js 從 guide/index.html 產生
  /^docs\/[^/]+\/intro\/index\.html$/];                    // 地區簡介由 build-intro.js 從 trips/<id>/intro/*.json 產生
const REBUILD_INPUT = /^docs\/\d{4}-\d{2}\/|^trips\/\d{4}-\d{2}\/((routes|coords|attractions)\.json|spots\/|intro\/|CLAUDE\.md$)/;

const PII = [
  ['電話', /(?:\+81|\+886)[-\s]?\d[\d\s-]{7,}\d|(?<![\d.])0\d{1,4}-\d{1,4}-\d{3,4}(?!\d)|(?<!\d)09\d{2}-?\d{3}-?\d{3}(?!\d)/g],
  ['email', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g],
  ['訂位代號', /(?:訂位代號|訂位編號|訂單編號|預約編號|予約番号|予約コード|確認番号|確認碼|PNR|booking (?:ref(?:erence)?|number|code)|confirmation (?:number|code))\s*[:：#]?\s*[A-Za-z0-9-]{4,}/gi],
  ['密碼', /(?:密碼|暗証番号|暗證|パスワード|password|key ?box|鑰匙箱|キーボックス)[^\n<]{0,10}?\d{3,}/gi],
];

const rel = (p) => path.relative(ROOT, path.resolve(ROOT, p || '')).split(path.sep).join('/');
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const stateFile = (sid) => path.join(STATE_DIR, 'hook-' + String(sid || 'none').replace(/[^\w-]/g, '') + '.json');
const loadState = (sid) => { try { return JSON.parse(read(stateFile(sid))) || {}; } catch { return {}; } };
function saveState(sid, s) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(stateFile(sid), JSON.stringify(s)); }
const add = (arr, v) => (arr || []).includes(v) ? arr : (arr || []).concat(v);

/* 這次要寫進去的文字（Edit 的 new_string、MultiEdit 的每一段、Write 的整份） */
function addedText(input) {
  if (input.content != null) return input.content;
  if (input.edits) return input.edits.map((e) => e.new_string || '').join('\n');
  return input.new_string || '';
}

/* 新出現的個資：檔案裡原本就有的（例如已經允許的飯店電話）不算 */
function newPII(text, existing) {
  const hits = [];
  for (const [kind, re] of PII) {
    for (const m of text.match(re) || []) if (!existing.includes(m) && !hits.includes(kind + '：' + m)) hits.push(kind + '：' + m);
  }
  return hits;
}

const { lintHtml, bannedFor } = require(path.join(ROOT, 'scripts', 'lib', 'lint.js'));

function out(obj) { process.stdout.write(JSON.stringify(obj)); }
function deny(reason) { out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }); }

function pre(ev) {
  const f = rel(ev.tool_input.file_path);
  if (GENERATED.some((re) => re.test(f))) {
    return deny(f + ' 是腳本產生的（build-v2.js／build-places.js／build-routes.js／build-spots.js／build-guide.js／build-intro.js／fetch-hero-photos.js），不要手改：改來源檔再跑 node scripts/rebuild.js');
  }
  const m = f.match(TRIP);
  if (m && f.startsWith('docs/') && !(loadState(ev.session_id).loaded || []).includes(m[1])) {
    return deny('改 docs/' + m[1] + '/ 之前，先用 Read 工具讀 trips/' + m[1] + '/CLAUDE.md（Bash 的 cat 不算；這趟的事實與規則，改 docs/ 時它不會自動載入）');
  }
  if (!/^(docs|trips)\//.test(f)) return;
  const hits = newPII(addedText(ev.tool_input), read(path.join(ROOT, f)));
  if (hits.length) {
    out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask',
      permissionDecisionReason: '這次寫入 ' + f + ' 有新的 ' + hits.join('、') + '。人名、個人電話、訂位代號、密碼不進 repo；店家、飯店、公家機關的電話可以。確定要寫嗎？' } });
  }
}

/* Bash 寫檔不經過上面的 pre／post，個資與格式檢查都會被跳過：用腳本（python、node、heredoc、重導向）寫某一趟的檔就擋下。
 * ponytail: 只認常見寫法；sed -i、cp 放行（new-trip 要用），格式另由 rebuild.js 的 lint 兜底 */
const BASH_WRITE = /\.write\(|write_text|writeFileSync|open\([^)]*['"][wa]\+?['"]|\btee\b|>{1,2}\s*['"]?(?:\.\/)?(?:docs|trips)\/\d{4}-\d{2}\//;
function bash(ev) {
  const cmd = ev.tool_input.command || '';
  if (/(?:docs|trips)\/\d{4}-\d{2}\//.test(cmd) && BASH_WRITE.test(cmd)) {
    deny('看起來是用 Bash 寫 docs/<id>/ 或 trips/<id>/ 的檔：hook 的個資與格式檢查只看得到 Edit／Write，請改用 Edit／Write（大段內容可以分幾次 Edit）');
  }
}

function post(ev) {
  const f = rel(ev.tool_input.file_path);
  const m = f.match(TRIP);
  const s = loadState(ev.session_id), before = JSON.stringify(s);
  if (m && f.startsWith('trips/')) s.loaded = add(s.loaded, m[1]);
  if (ev.tool_name !== 'Read' && m && REBUILD_INPUT.test(f)) s.dirty = add(s.dirty, m[1]);
  if (JSON.stringify(s) !== before) saveState(ev.session_id, s);
  if (ev.tool_name === 'Read') return;

  const text = read(path.join(ROOT, f));
  const errs = [];
  if (/^(docs|trips\/_template\/site)\/.*\.html$/.test(f) && !f.startsWith('docs/v2/')) errs.push(...lintHtml(text, m ? bannedFor(ROOT, m[1]) : []));
  if (/^trips\/.*\.json$/.test(f)) { try { JSON.parse(text); } catch (e) { errs.push('json 解析失敗：' + e.message); } }
  if (errs.length) { process.stderr.write(f + '：\n- ' + errs.join('\n- ') + '\n'); process.exit(2); }
}

function stop(ev) {
  const s = loadState(ev.session_id);
  if (!(s.dirty || []).length) return;
  const failed = [];
  for (const id of s.dirty) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'rebuild.js'), '--trip', id], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) failed.push('rebuild.js --trip ' + id + ' 失敗：\n' + ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-15).join('\n'));
  }
  if (!failed.length) {
    out({ systemMessage: '已自動重建：' + s.dirty.join('、') + '（地圖、新版介面、Service Worker 快取版本）' });
    delete s.dirty;
    return saveState(ev.session_id, s);
  }
  if (ev.stop_hook_active) return out({ systemMessage: failed.join('\n\n') + '\n\n（已經擋過一次，這次不再擋；請手動處理）' });
  process.stderr.write(failed.join('\n\n') + '\n修好後再停下來，會自動重跑。\n');
  process.exit(2);
}

function reset(ev) { fs.rmSync(stateFile(ev.session_id), { force: true }); }

function test() {
  const assert = require('assert');
  assert.deepStrictEqual(newPII('電話 080-4587-6688', ''), ['電話：080-4587-6688']);
  assert.deepStrictEqual(newPII('電話 080-4587-6688', '原本就有 080-4587-6688'), []);
  assert.deepStrictEqual(newPII('營業 10:00-17:00、¥2,200、2026-11-18、船津 294-1', ''), []);
  assert.strictEqual(newPII('予約番号：AB12CD', '').length, 1);
  assert.strictEqual(newPII('鑰匙箱密碼 4821', '').length, 1);
  assert.strictEqual(newPII('+81 90 1234 5678', '').length, 1);
  assert.deepStrictEqual(lintHtml('<div class="timeline-item is-main"><span class="tl-kind main">'), []);
  assert.strictEqual(lintHtml('<div class="timeline-item is-main">').length, 1);
  assert.strictEqual(lintHtml('<a href="https://maps.google.com/maps?q=%E6%9D%B1">').length, 1);
  assert.strictEqual(lintHtml('<details class="alt-plan"><a class="map-link"></details>').length, 1);
  assert.strictEqual(lintHtml('<button id="nav-2"></button><button id="nav-2"></button>').length, 1);
  assert.strictEqual(lintHtml('<div class="lane" data-who="family"></div><div class="lane" data-who="solo"></div><!-- /lane -->').length, 1);
  assert.strictEqual(lintHtml('<p>大人 ¥1,000、<b>小人</b> ¥500</p>', [{ re: /小人/, why: 'x' }]).length, 1);
  assert.ok(GENERATED.some((re) => re.test('docs/v2/2026-11/final/index.html')));
  assert.ok(!GENERATED.some((re) => re.test('docs/2026-11/final/index.html')));
  assert.ok(GENERATED.some((re) => re.test('docs/2026-12/guide/panda.html')));
  assert.ok(!GENERATED.some((re) => re.test('docs/2026-12/guide/index.html')));
  assert.ok(GENERATED.some((re) => re.test('docs/2026-12/intro/index.html')));
  assert.ok(REBUILD_INPUT.test('trips/2026-12/intro/chengdu.json') && REBUILD_INPUT.test('trips/2026-12/CLAUDE.md'));
  assert.strictEqual('trips/2026-11/coords.json'.match(TRIP)[1], '2026-11');
  assert.ok(!TRIP.test('trips/_template/site/final/index.html'));
  const blocked = (c) => /(?:docs|trips)\/\d{4}-\d{2}\//.test(c) && BASH_WRITE.test(c);
  assert.ok(blocked("python3 -c \"open('docs/2099-11/final/index.html','w').write(h)\""));
  assert.ok(blocked('cat > trips/2099-11/routes.json <<EOF'));
  assert.ok(!blocked('grep -n nav docs/2099-11/final/index.html > /tmp/x'));
  assert.ok(!blocked("sed -i '' 's/a/b/' trips/2099-11/CLAUDE.md"));
  assert.ok(!blocked('node scripts/rebuild.js --trip 2099-11'));
  console.log('ok');
}

const mode = process.argv[2];
if (mode === 'test') test();
else {
  let raw = '';
  process.stdin.on('data', (d) => { raw += d; });
  process.stdin.on('end', () => {
    const ev = JSON.parse(raw || '{}');
    ev.tool_input = ev.tool_input || {};
    ({ pre, post, bash, stop, reset })[mode](ev);
  });
}
