// H4 packaged upgrade asserter — proves a REAL v1.4.0-binary-authored userData profile is
// opened correctly by the REAL v2.0.0 binary. Profile isolation (move real aside, restore the
// 1.4.0 fixture) is the CALLER's job (macOS Electron ignores $HOME). This driver just attaches
// over CDP to whatever profile is live and asserts the upgrade contract.
//
// Usage: node h4-upgrade.mjs <binary> <phase>   phase: upgrade | reopen
//   upgrade — first 2.0.0 launch on the 1.4.0 profile: boots, 1.4.0 Local Storage survives,
//             IndexedDB initialized fresh, a case is created + persisted at schema v1.
//   reopen  — relaunch on the same profile: the case survived, exactly one, schema v1, idempotent.
import { spawn, execSync } from 'node:child_process';

const [bin, phase] = process.argv.slice(2);
const PORT = 9600 + (process.pid % 300);
const child = spawn(bin, [`--remote-debugging-port=${PORT}`], { env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; let exited = null;
child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
child.on('exit', (c, s) => { exited = { c, s }; });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function ownsPort(stage) {
  let pids = [];
  try { pids = execSync(`lsof -t -iTCP:${PORT} -sTCP:LISTEN`, { encoding: 'utf8', timeout: 5000 }).trim().split('\n').filter(Boolean).map(Number); }
  catch (e) { throw new Error('lsof failed at ' + stage + ': ' + e.message); }
  const isOurs = (pid) => { let c = pid; for (let h = 0; h < 10; h++) { if (c === child.pid) return true; let pp; try { pp = Number(execSync(`ps -o ppid= -p ${c}`, { encoding: 'utf8', timeout: 3000 }).trim()); } catch (_) { return false; } if (!pp || pp <= 1) return false; c = pp; } return false; };
  if (!(pids.length && pids.every(isOurs))) throw new Error(`port ${PORT} bound by ${JSON.stringify(pids)} not our child ${child.pid} at ${stage}`);
}
async function page() {
  for (let i = 0; i < 40; i++) { if (exited) throw new Error('exited early ' + JSON.stringify(exited) + ' ' + log.slice(-300)); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); const p = l.find(t => t.type === 'page'); if (p) return p; } catch (_) {} await sleep(400); }
  throw new Error('no CDP page');
}
let ws, id = 0; const pend = new Map();
const send = (m, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('cdp timeout ' + m)); } }, 15000); });
async function ev(expr) { const m = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (m.result.exceptionDetails) throw new Error('eval threw: ' + JSON.stringify(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text)); return m.result.result.value; }

const results = [];
const chk = (n, ok, extra) => { results.push({ n, ok: !!ok }); console.log((ok ? '  ✓ ' : '  ✗ ') + `[${phase}] ` + n + (extra !== undefined && !ok ? ' :: ' + JSON.stringify(extra) : '')); };

try {
  const pg = await page();
  ownsPort('post-discovery');
  ws = new WebSocket(pg.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m); pend.delete(m.id); } };
  await sleep(4000);

  chk('2.0.0 boots on the 1.4.0-authored profile (no preload crash)', !/Unable to load preload script/.test(log));
  const title = await ev('document.title');
  chk('renderer alive (document.title present)', typeof title === 'string' && title.length > 0, title);
  const ver = await ev('electronAPI.getAppVersion()');
  chk('reports version 2.0.0', ver === '2.0.0', ver);

  if (phase === 'upgrade') {
    // The 1.4.0 profile had a Local Storage sentinel authored BY THE REAL 1.4.0 BINARY (h4_sentinel)
    // but NO IndexedDB. 2.0.0 must initialize IndexedDB fresh + persist a schema-v1 case WITHOUT
    // destroying the pre-existing 1.4.0 Local Storage. The expected sentinel is passed via env.
    const expectedSentinel = process.env.H4_SENTINEL || '';
    const seed = await ev(`(async function(){
      const be = StorageBackend.IndexedDBBackend();
      const store = CaseStore.createCaseStore(be);
      const created = await store.create({ metadata: { title: 'h4-upgrade-case', vehicle: 'F312', track: null } });
      if (!created.ok) return { ok:false, code: created.code, error: created.error };
      const back = await store.open(created.caseId);
      const raw = await be.get('cases', created.caseId);
      return { ok: back.ok === true, caseId: created.caseId, title: back.ok ? back.metadata.title : null, schemaVersion: raw ? raw.schemaVersion : null, sentinel: (function(){ try { return localStorage.getItem('h4_sentinel'); } catch(e){ return 'ERR:'+e.message; } })(), marker: (function(){ try { return localStorage.getItem('h4_marker'); } catch(e){ return 'ERR:'+e.message; } })() };
    })()`);
    chk('IndexedDB initialized + case persisted over the 1.4.0 profile', seed && seed.ok === true, seed);
    chk('created case is schema v1', seed && seed.schemaVersion === 1, seed);
    // NON-VACUOUS: the exact sentinel string the 1.4.0 binary wrote must be read back intact.
    chk('1.4.0-authored Local Storage sentinel SURVIVED the upgrade (exact value)', !!expectedSentinel && seed && seed.sentinel === expectedSentinel, { got: seed && seed.sentinel, expected: expectedSentinel });
    chk('1.4.0-authored h4_marker also survived', seed && seed.marker === 'present', seed && seed.marker);
    console.log('SEEDED=' + (seed && seed.caseId));
  }

  if (phase === 'reopen') {
    const found = await ev(`(async function(){
      const be = StorageBackend.IndexedDBBackend();
      const store = CaseStore.createCaseStore(be);
      const list = await store.list();
      const hit = (list || []).find(c => c.title === 'h4-upgrade-case');
      if (!hit) return { ok:false, listLen:(list||[]).length };
      const o1 = await store.open(hit.caseId);
      const o2 = await store.open(hit.caseId); // idempotent
      const raw = await be.get('cases', hit.caseId);
      return { ok: o1.ok === true && o2.ok === true, listLen: list.length, schemaVersion: raw ? raw.schemaVersion : null, idempotent: JSON.stringify(o1.metadata) === JSON.stringify(o2.metadata) };
    })()`);
    chk('upgraded case SURVIVED 2.0.0 restart', found && found.ok === true, found);
    chk('exactly one case (no duplication across the upgrade)', found && found.listLen === 1, found);
    chk('schema v1 read back unchanged', found && found.schemaVersion === 1, found);
    chk('open() is idempotent', found && found.idempotent === true, found);
  }

  chk('spawned binary still alive (target ownership)', exited === null, exited);
  try { ownsPort('end'); chk('port still owned by our child (lsof)', true); } catch (e) { chk('port still owned by our child (lsof)', false, e.message); }

  const failed = results.filter(r => !r.ok).length;
  console.log(`H4-UPGRADE(${phase}): ${results.length - failed} passed, ${failed} failed`);
  child.kill('SIGTERM'); await sleep(900); process.exit(failed ? 1 : 0);
} catch (e) {
  console.error(`H4-UPGRADE(${phase}) FATAL: ` + e.message);
  child.kill('SIGKILL'); process.exit(2);
}
