// H5 packaged UI-truth asserter — REAL binary over CDP.
//   1. Comparisons pane: publicly reachable (LIVE)
//   2. Engineer Brief: navigating the case subview REVEALS the mount and it contains
//      RENDERED content (non-empty DOM — no blank pane, no mount-only shell)
//   3. Deferred subviews are NOT in the live navigation state
//   4. Excluded modules are genuinely ABSENT from the packaged asar
// Usage: node tests/packaged/h5-ui-truth.mjs <binary> <asarPath>
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';

const [bin, asarPath] = process.argv.slice(2);
const PORT = 9700 + (process.pid % 200);
const child = spawn(bin, [`--remote-debugging-port=${PORT}`], { env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; let exited = null;
child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
child.on('exit', (c, s) => { exited = { c, s }; });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function ownsPort(stage) {
  let pids = [];
  try { pids = execSync(`lsof -t -iTCP:${PORT} -sTCP:LISTEN`, { encoding: 'utf8', timeout: 5000 }).trim().split('\n').filter(Boolean).map(Number); } catch (e) { throw new Error('lsof failed: ' + e.message); }
  const ours = (pid) => { let c = pid; for (let h = 0; h < 10; h++) { if (c === child.pid) return true; let pp; try { pp = Number(execSync(`ps -o ppid= -p ${c}`, { encoding: 'utf8', timeout: 3000 }).trim()); } catch (_) { return false; } if (!pp || pp <= 1) return false; c = pp; } return false; };
  if (!(pids.length && pids.every(ours))) throw new Error(`port ${PORT} not ours at ${stage}`);
}
async function page() {
  for (let i = 0; i < 40; i++) { if (exited) throw new Error('exited early: ' + log.slice(-200)); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); const p = l.find(t => t.type === 'page'); if (p) return p; } catch (_) {} await sleep(400); }
  throw new Error('no CDP page');
}
let ws, id = 0; const pend = new Map();
const send = (m, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('cdp timeout')); } }, 15000); });
async function ev(expr) { const m = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (m.result.exceptionDetails) throw new Error('eval threw: ' + JSON.stringify(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text)); return m.result.result.value; }
const results = [];
const chk = (n, ok, extra) => { results.push({ n, ok: !!ok }); console.log((ok ? '  ✓ ' : '  ✗ ') + '[h5] ' + n + (extra !== undefined && !ok ? ' :: ' + JSON.stringify(extra) : '')); };

try {
  // 4. asar absence FIRST — via the asar FILE LISTING (its header directory), not a raw
  //    byte scan: shipped files may legitimately MENTION an excluded filename in comments.
  const INERT = ['i18n-r3-0e.js','r3-0c-comparison-adapter.js','r3-0c-corner-pairing.js','r3-0c-corner-segmentation.js','r3-0c-distance-authority.js','r3-0c-lap-authority.js','r3-0c-normalized-distance.js','r3-0c-reference-selection.js','r3-0c-track-identity.js','r3-0e-experiment-viewmodel.js','r3-0e-followup-timeline.js','r3-0e-outcome-classifier.js','r3-0e-stores.js','r3-0f-migration-engine.js','vehicle-profile-f312.js'];
  const listing = execSync(`npx @electron/asar list ${JSON.stringify(asarPath)}`, { encoding: 'utf8', timeout: 60000 }).split('\n');
  const leaked = INERT.filter(f => listing.some(l => l.endsWith('/' + f)));
  chk('excluded modules ABSENT from the packaged asar file listing (all 15)', leaked.length === 0, leaked);
  chk('shipped comparison bundle PRESENT in asar listing', listing.some(l => l.endsWith('/r3-0c-contracts-bundle.js')));
  chk('shipped engineer-ui PRESENT in asar listing', listing.some(l => l.endsWith('/r3-0d-engineer-ui.js')));

  const pg = await page();
  ownsPort('post-discovery');
  ws = new WebSocket(pg.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m); pend.delete(m.id); } };
  await sleep(4000);

  // 1. Comparisons LIVE
  const comp = await ev(`(function(){ const el = document.querySelector('[data-r3c-c7-pane]'); return { present: !!el }; })()`);
  chk('Comparisons pane node present (LIVE)', comp && comp.present === true, comp);

  // 3. deferred subviews not in live navigation
  const nav = await ev(`(function(){ try { return FeatureRegistry.deriveCaseNav().map(n=>n.id); } catch(e){ return ['ERR:'+e.message]; } })()`);
  chk('deferred subviews NOT in live nav', Array.isArray(nav) && !nav.includes('experiment_loop') && !nav.includes('case_timeline'), nav);
  chk('engineer_brief IS in live nav', Array.isArray(nav) && nav.includes('engineer_brief'), nav);

  // 2. Engineer Brief reveals with rendered content on navigation
  const brief = await ev(`(async function(){
    const root = document.querySelector('body')._x_dataStack ? null : null; // noop guard
    const st = Alpine ? Alpine.$data(document.body) : null;
    if (!st) return { err: 'no alpine' };
    st.shellSection = 'cases'; st.caseSubview = 'engineer_brief';
    await new Promise(r => setTimeout(r, 400));
    const el = document.getElementById('r3-0d-engineer-brief-mount');
    return {
      hidden: el.classList.contains('hidden'),
      ariaHidden: el.getAttribute('aria-hidden'),
      childCount: el.children.length,
      textLen: (el.textContent || '').trim().length,
      mounted: el.getAttribute('data-r3-0d-engineer-brief') === 'mounted',
    };
  })()`);
  chk('brief mount REVEALED on subview navigation (hidden class removed)', brief && brief.hidden === false, brief);
  chk('brief aria-hidden=false when revealed', brief && brief.ariaHidden === 'false', brief);
  chk('brief pane has RENDERED content (mounted, non-empty DOM)', brief && brief.mounted === true && brief.childCount > 0 && brief.textLen > 0, brief);

  // navigating away hides it again
  const away = await ev(`(async function(){
    const st = Alpine.$data(document.body);
    st.caseSubview = 'overview';
    await new Promise(r => setTimeout(r, 300));
    const el = document.getElementById('r3-0d-engineer-brief-mount');
    return { hidden: el.classList.contains('hidden') };
  })()`);
  chk('brief hides again when navigating away', away && away.hidden === true, away);

  chk('binary still alive (ownership)', exited === null, exited);
  ownsPort('end');
  chk('port still ours at end (lsof)', true);

  const failed = results.filter(r => !r.ok).length;
  console.log(`H5-UI-TRUTH: ${results.length - failed} passed, ${failed} failed`);
  child.kill('SIGTERM'); await sleep(800); process.exit(failed ? 1 : 0);
} catch (e) {
  console.error('H5-UI-TRUTH FATAL: ' + e.message);
  child.kill('SIGKILL'); process.exit(2);
}
