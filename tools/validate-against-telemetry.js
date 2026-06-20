/**
 * tools/validate-against-telemetry.js — LOCAL, clean-room model-vs-reality validation
 * WITH a FAIL-CLOSED preflight.
 *
 * The whole point: do NOT present a confident measured K_us / yaw gain / roll gradient when the
 * channel definitions, units, signs, steering ratio, motion-ratio convention or timebase are not
 * CONFIRMED. Unconfirmed → the metric is graded PROVISIONAL (clearly flagged, "not official") or
 * BLOCKED (cannot be computed safely). Only when every required definition is confirmed in a
 * runtime config does a metric become CONFIRMED.
 *
 * Definitions are confirmed via a repo-EXTERNAL JSON config (so nothing real or assumed is baked
 * into the repo). See the schema printed by `--help-config`. Example:
 *   node tools/validate-against-telemetry.js outing.csv --config defs.json
 * Without --config every dependent metric is provisional/blocked by design.
 *
 *   node tools/validate-against-telemetry.js --selftest
 *
 * Scope (by request): this tool only adds preflight + config + grading + reporting + synthetic
 * tests. It does NOT change the app's vehicle-dynamics formulas, does NOT make F312 a global app
 * default, and never claims a real K_us / roll gradient is "verified".
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const G = 9.81;

// Shared PURE data layer (V1 Step 1): CSV parse, units, stats, timebase, channel resolution &
// definition grading — single source of truth used by CLI + renderer + tests (telemetry-core.js).
const C = require('../renderer/js/telemetry-core.js');
const { linfit, linfitOrigin, columnMap, resolveChannel, SPEC, toMs, toG, yawToRadS,
        timebaseReport, worst, chGrade, GRADE } = C;
// thin wrapper → legacy column-map shape {data,units,n,channels} for the measured-* below.
const parseCsv = (text) => columnMap(C.parseCsv(text));
// Dallara F312 geometry (public manual facts), now provided by telemetry-core.
const F312 = C.F312;

// Model side (unchanged; geometry + weight real, springs/ARB still approximate — see report).
const F312_MODEL_SETUP = {
  wheelbase: 2800, front_track: 1595, rear_track: 1540, front_motion_ratio: 1.390, rear_motion_ratio: 1.30,
  total_weight: 569, weight_front_pct: 49.4, cg_height: 290,
  front_spring_rate: 130, rear_spring_rate: 166, front_arb: 200, rear_arb: 150,
};

// stats / CSV / channel resolution / SPEC / unit converters / timebaseReport / worst / chGrade
// now live in telemetry-core.js (imported above). CLI-specific analysis follows.

// ── steady-state selection (params visible & adjustable) ──
const DEFAULT_FILTER = { minSpeed_ms: 8, minAy_g: 0.3, maxDAyDt_g_s: 4.0, maxDSteer_dps: 60, maxBrake: null, minSegment_s: 0.2 };
function selectSteady(tel, sp, ay, st, time, f) {
  const dt = (time && time.length > 1 && time[1] != null && time[0] != null) ? (time[1] - time[0]) : 0.02;
  const brake = tel.data['pbrake_f'] || null;
  const sel = new Array(sp.length).fill(false);
  for (let i = 2; i < sp.length - 2; i++) {
    if (sp[i] == null || ay[i] == null || st[i] == null) continue;
    if (sp[i] < f.minSpeed_ms || Math.abs(ay[i]) < f.minAy_g) continue;
    const dAy = (ay[i + 2] != null && ay[i - 2] != null) ? Math.abs(ay[i + 2] - ay[i - 2]) / (4 * dt) : 0;
    const dSt = (st[i + 2] != null && st[i - 2] != null) ? Math.abs(st[i + 2] - st[i - 2]) / (4 * dt) : 0;
    if (dAy > f.maxDAyDt_g_s || dSt > f.maxDSteer_dps) continue;
    if (f.maxBrake != null && brake && brake[i] != null && brake[i] > f.maxBrake) continue;
    sel[i] = true;
  }
  // enforce minimum contiguous segment duration
  const minRun = Math.max(1, Math.round(f.minSegment_s / dt));
  let i = 0, segments = [], selCount = 0;
  while (i < sel.length) { if (!sel[i]) { i++; continue; } let j = i; while (j < sel.length && sel[j]) j++; if (j - i >= minRun) { segments.push([i, j - 1]); selCount += j - i; } else { for (let k = i; k < j; k++) sel[k] = false; } i = j; }
  return { sel, segments, selCount, dt };
}

// ── measured understeer (left/right separated; provisional unless steer+accy+speed+timebase confirmed) ──
function measuredUndersteer(tel, cfg, tb, f) {
  const Rspeed = resolveChannel(cfg, tel, 'speed', 'speed', SPEC.speed);
  const Rsteer = resolveChannel(cfg, tel, 'steer', 'steer', SPEC.steer);
  const Raccy = resolveChannel(cfg, tel, 'accy', 'accy', SPEC.accy);
  const channels = [Rspeed, Rsteer, Raccy];
  const blockers = channels.flatMap(r => r.blocked);
  const grade0 = worst(chGrade(Rspeed), chGrade(Rsteer), chGrade(Raccy), tb.status);
  if (blockers.length || tb.status === 'blocked') {
    return { grade: 'blocked', available: false, blockers: blockers.concat(tb.status === 'blocked' ? tb.reason : []), channels };
  }
  // convert & compute (road-wheel angle δ); steer meaning matters:
  const L = (cfg.geometry && cfg.geometry.wheelbase_mm || F312.wheelbase_mm) / 1000;
  const time = tel.data['time'] || tel.data['xtime'] || null;
  const sp = Rspeed.arr.map(x => x == null ? null : toMs(Rspeed.unit, x));
  const ayg = Raccy.arr.map(x => x == null ? null : (toG(Raccy.unit, x) - (Raccy.val.offset || 0)) * (Raccy.val.sign || 1));
  const stRaw = Rsteer.arr.map(x => x == null ? null : (x - (Rsteer.val.offset_deg || 0)) * (Rsteer.val.sign || 1));
  const ratio = Rsteer.val.meaning === 'road_wheel_angle' ? 1 : (Rsteer.val.steering_ratio || F312.steeringRatioDefault);
  const stUnit = Rsteer.unit;
  const toDeg = stUnit.includes('rad') ? (x => x * 180 / Math.PI) : (x => x);
  const sel = selectSteady(tel, sp, ayg, stRaw, time, f);
  const L_x = [], L_y = [], R_x = [], R_y = [], allX = [], allY = [];
  let ayMin = Infinity, ayMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < sel.sel.length; i++) {
    if (!sel.sel[i]) continue;
    const v = sp[i], ay = ayg[i]; const aAbs = Math.abs(ay);
    const deltaDeg = toDeg(stRaw[i]) / ratio;
    const Rr = v * v / (aAbs * G);
    const resid = Math.abs(deltaDeg) - (L / Rr) * 180 / Math.PI;
    allX.push(aAbs); allY.push(resid);
    if (ay >= 0) { L_x.push(aAbs); L_y.push(resid); } else { R_x.push(aAbs); R_y.push(resid); }
    ayMin = Math.min(ayMin, aAbs); ayMax = Math.max(ayMax, aAbs); vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
  }
  if (allX.length < 30) return { grade: 'blocked', available: false, blockers: [`only ${allX.length} steady-state points (need ≥30); loosen filters or longer stint`], channels, selCount: sel.selCount };
  const comb = linfit(allX, allY), left = linfit(L_x, L_y), right = linfit(R_x, R_y);
  const asym = (left.n >= 10 && right.n >= 10) ? Math.abs(left.slopeOrigin - right.slopeOrigin) : null;
  const grade = grade0; // confirmed only if all channels+timebase confirmed
  return {
    grade, available: grade === GRADE.DEFINITION_CONFIRMED,
    label: grade === GRADE.DEFINITION_CONFIRMED ? 'understeer gradient K_us [deg/g]' : 'PROVISIONAL understeer slope [deg/g] (NOT official K_us)',
    combined: comb.slopeOrigin, combinedIntercept: comb.slope, r2: comb.r2, n: comb.n,
    left: left.n ? left.slopeOrigin : null, right: right.n ? right.slopeOrigin : null, leftN: left.n, rightN: right.n,
    asymmetry: asym, asymWarn: asym != null && asym > 0.3,
    ayRange: [ayMin, ayMax], speedRange: [vMin, vMax],
    selCount: sel.selCount, segments: sel.segments.length,
    assumed: Array.from(new Set(channels.flatMap(r => r.assumed.map(a => r.key + '.' + a)))),
    steerMeaning: Rsteer.val.meaning, steeringRatioUsed: ratio,
    channels,
  };
}

// ── measured yaw response (provisional unless yaw+steer+speed confirmed) ──
function measuredYaw(tel, cfg, tb, opt) {
  const Ryaw = resolveChannel(cfg, tel, 'yaw', 'yaw', SPEC.yaw);
  const Rsteer = resolveChannel(cfg, tel, 'steer', 'steer', SPEC.steer);
  const Rspeed = resolveChannel(cfg, tel, 'speed', 'speed', SPEC.speed);
  const blockers = [Ryaw, Rsteer, Rspeed].flatMap(r => r.blocked);
  if (blockers.length || tb.status === 'blocked') return { grade: 'blocked', available: false, blockers: blockers.concat(tb.status === 'blocked' ? tb.reason : []) };
  const grade = worst(chGrade(Ryaw), chGrade(Rsteer), chGrade(Rspeed), tb.status);
  const ratio = Rsteer.val.meaning === 'road_wheel_angle' ? 1 : (Rsteer.val.steering_ratio || F312.steeringRatioDefault);
  const stToDeg = Rsteer.unit.includes('rad') ? (x => x * 180 / Math.PI) : (x => x);
  const vt = opt.speedTarget / 3.6, band = 8 / 3.6;
  const xs = [], ys = [];
  for (let i = 0; i < Ryaw.arr.length; i++) {
    if (Ryaw.arr[i] == null || Rsteer.arr[i] == null || Rspeed.arr[i] == null) continue;
    const v = toMs(Rspeed.unit, Rspeed.arr[i]); if (Math.abs(v - vt) > band) continue;
    const deltaRad = (stToDeg(Rsteer.arr[i]) / ratio) * Math.PI / 180; if (Math.abs(deltaRad) < 0.5 * Math.PI / 180) continue;
    xs.push(deltaRad); ys.push(yawToRadS(Ryaw.unit, Ryaw.arr[i]) * (Ryaw.val.sign || 1));
  }
  if (xs.length < 20) return { grade: 'blocked', available: false, blockers: [`only ${xs.length} points near ${opt.speedTarget} km/h`] };
  const f = linfit(xs, ys);
  return {
    grade, available: grade === GRADE.DEFINITION_CONFIRMED,
    label: grade === GRADE.DEFINITION_CONFIRMED ? `yaw-rate gain [1/s] @${opt.speedTarget}km/h` : `NORMALIZED yaw-response candidate [1/s] @${opt.speedTarget}km/h (NOT official yaw gain)`,
    gain: f.slope, r2: f.r2, n: f.n,
  };
}

// ── roll: by request, WITHOUT confirmed damper meaning/unit/sign + MR convention + an explicit
//    body-roll model, output only the RAW left-right damper-displacement-vs-ay slope. Never call
//    it body roll gradient until confirmed. ──
function measuredRoll(tel, cfg, tb, f) {
  const Rfl = resolveChannel(cfg, tel, 'damper_fl', 'trvdam_fl', SPEC.damper);
  const Rfr = resolveChannel(cfg, tel, 'damper_fr', 'trvdam_fr', SPEC.damper);
  const Raccy = resolveChannel(cfg, tel, 'accy', 'accy', SPEC.accy);
  const mr = (cfg.motion_ratio) || {};
  const blockers = [Rfl, Rfr, Raccy].flatMap(r => r.blocked);
  if (blockers.length || tb.status === 'blocked') return { grade: 'blocked', available: false, blockers: blockers.concat(tb.status === 'blocked' ? tb.reason : []) };
  const ayg = Raccy.arr.map(x => x == null ? null : (toG(Raccy.unit, x) - (Raccy.val.offset || 0)) * (Raccy.val.sign || 1));
  const xs = [], ys = [];
  for (let i = 0; i < Raccy.arr.length; i++) { if (Rfl.arr[i] == null || Rfr.arr[i] == null || ayg[i] == null) continue; if (Math.abs(ayg[i]) < f.minAy_g) continue; xs.push(Math.abs(ayg[i])); ys.push((Rfl.arr[i] - Rfr.arr[i]) * (Rfl.val.sign || 1)); }
  if (xs.length < 30) return { grade: 'blocked', available: false, blockers: [`only ${xs.length} points`] };
  const fit = linfit(xs, ys);
  const damperConfirmed = Rfl.confirmed && Rfr.confirmed && mr.definition;
  // body roll only if a body-roll model is explicitly enabled AND damper+MR confirmed
  const bodyRollEnabled = cfg.roll_model && cfg.roll_model.body_roll_from_front_damper === true && damperConfirmed;
  let bodyRoll = null;
  if (bodyRollEnabled) {
    const mrFront = (mr.front != null ? mr.front : F312.mrFrontDamper);
    const wheelPerDamper = mr.definition === 'wheel_over_damper' ? mrFront : 1 / mrFront; // travel ratio
    const tF = (cfg.geometry && cfg.geometry.front_track_mm) || F312.frontTrack_mm;
    const xs2 = xs, ys2 = ys.map(d => Math.atan2(d * wheelPerDamper, tF) * 180 / Math.PI);
    bodyRoll = linfit(xs2, ys2);
  }
  return {
    grade: 'provisional', available: false,           // body-roll-from-single-axle-damper is a simplification → never auto-confirmed
    rawDiffSlope: fit.slope, rawDiffR2: fit.r2, rawDiffUnit: Rfl.unitKnown ? Rfl.unit : '(unit?)', n: fit.n,
    bodyRollGradient: bodyRoll ? bodyRoll.slope : null, bodyRollR2: bodyRoll ? bodyRoll.r2 : null,
    note: bodyRollEnabled
      ? 'body roll gradient computed from FRONT damper only (heave/kerb NOT excluded, rear axle not combined) — provisional'
      : 'raw L-R damper-displacement slope only; NOT body roll gradient (confirm damper meaning/unit/sign + MR convention + enable roll_model to get a provisional body-roll estimate)',
    damperConfirmed, mrDefinition: mr.definition || '(assumed)',
  };
}

// ── model prediction (unchanged; separate from measured grading) ──
function modelUndersteer(setup) {
  try {
    const jsDir = path.join(__dirname, '..', 'renderer', 'js');
    const src = ['calibration.js', 'tire-data.js', 'dynamics-model.js'].map(f => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n') + '\nthis.__m = { Tier1BasicBalance };';
    const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'model.js' });
    const r = new ctx.__m.Tier1BasicBalance(setup).calculate();
    return { ok: true, kus: r.understeer_gradient, roll: r.roll_gradient_deg_per_g };
  } catch (e) { return { ok: false, reason: e.message }; }
}

// ── report ──
function report(tel, cfg, opt) {
  const tb = timebaseReport(tel);
  const us = measuredUndersteer(tel, cfg, tb, opt.filter);
  const yaw = measuredYaw(tel, cfg, tb, opt);
  const roll = measuredRoll(tel, cfg, tb, opt.filter);
  const model = modelUndersteer(F312_MODEL_SETUP);
  const tag = g => g === GRADE.DEFINITION_CONFIRMED ? '✅ DEFINITION-CONFIRMED' : (g === 'provisional' ? '⚠ PROVISIONAL' : '⛔ BLOCKED');

  console.log('=== Telemetry validation preflight:', opt.csvName, '===');
  console.log('rows:', tel.n, '| channels:', tel.channels.join(', '));
  console.log('config:', opt.configName || '(none → definitions UNCONFIRMED, fail-closed)');

  console.log('\n--- TIMEBASE / SYNC ---', tag(tb.status));
  if (tb.dt) console.log(`  time: median dt ${tb.dt.median}s, min ${tb.dt.min}, max ${tb.dt.max}, n ${tb.dt.n}; monotonic=${tb.monotonic} dups=${tb.dups} resets=${tb.resets} gaps=${tb.gaps}`);
  else console.log('  no time/xtime column');
  if (tb.reason.length) console.log('  ' + tb.reason.join('; '));
  console.log('  per-channel: ' + tb.perCh.map(c => `${c.name}(n=${c.count},miss=${c.missingRatio})`).join('  '));

  console.log('\n--- MEASURED understeer ---', tag(us.grade));
  if (us.grade === 'blocked') { console.log('  ⛔ ' + us.blockers.join('; ')); }
  else {
    console.log(`  ${us.label}`);
    console.log(`  combined ${us.combined.toFixed(3)}  (left ${us.left == null ? 'n/a' : us.left.toFixed(3)} n=${us.leftN}, right ${us.right == null ? 'n/a' : us.right.toFixed(3)} n=${us.rightN})`);
    if (us.asymWarn) console.log(`  ⚠ left/right asymmetry Δ${us.asymmetry.toFixed(3)} deg/g — check sign convention / offset, do NOT trust the combined average`);
    console.log(`  R²=${us.r2.toFixed(3)}, points=${us.n} (selected ${us.selCount} in ${us.segments} segments), ay ${us.ayRange[0].toFixed(2)}..${us.ayRange[1].toFixed(2)} g, speed ${us.speedRange[0].toFixed(1)}..${us.speedRange[1].toFixed(1)} m/s`);
    console.log(`  steer meaning=${us.steerMeaning}, ratio used=${us.steeringRatioUsed}`);
    if (us.assumed.length) console.log('  ⚠ ASSUMED (unconfirmed → provisional): ' + us.assumed.join(', '));
    console.log('  measured_Kus_available = ' + us.available);
  }

  console.log('\n--- MEASURED yaw response ---', tag(yaw.grade));
  if (yaw.grade === 'blocked') console.log('  ⛔ ' + yaw.blockers.join('; '));
  else { console.log(`  ${yaw.label}: ${yaw.gain.toFixed(4)} (R²=${yaw.r2.toFixed(3)}, n=${yaw.n})`); console.log('  measured_yaw_gain_available = ' + yaw.available); }

  console.log('\n--- MEASURED roll ---', tag(roll.grade));
  if (roll.grade === 'blocked') console.log('  ⛔ ' + roll.blockers.join('; '));
  else {
    console.log(`  raw L-R front damper-diff slope: ${roll.rawDiffSlope.toFixed(4)} ${roll.rawDiffUnit}/g (R²=${roll.rawDiffR2.toFixed(3)}, n=${roll.n})`);
    if (roll.bodyRollGradient != null) console.log(`  provisional body roll gradient: ${roll.bodyRollGradient.toFixed(3)} deg/g (R²=${roll.bodyRollR2.toFixed(3)})`);
    console.log('  ' + roll.note);
    console.log('  measured_roll_gradient_available = ' + roll.available + '  (MR def: ' + roll.mrDefinition + ')');
  }

  console.log('\n--- MODEL prediction (F312, separate; springs/ARB/CG approximate) ---');
  if (model.ok) console.log(`  understeer_gradient ${model.kus.toFixed(3)} deg/g, roll ${model.roll.toFixed(3)} deg/g`);
  else console.log('  model load failed: ' + model.reason);

  console.log('\n--- COMPARISON ---');
  if (us.available && model.ok) console.log(`  K_us  real ${us.combined.toFixed(2)} vs model ${model.kus.toFixed(2)} deg/g  → Δ ${(us.combined - model.kus).toFixed(2)}`);
  else console.log('  ⛔ not shown: measured K_us is not CONFIRMED (see preflight). Confirm channel definitions via --config first.');
}

// ── synthetic self-tests ──
function makeCsv(kus, roll, { steerUnit = 'deg', accyUnit = 'g', ratio = 12.5, withTime = true, leftKus = null, gap = false } = {}) {
  const L = F312.wheelbase_mm / 1000, tF = F312.frontTrack_mm, MR = 1.39;
  const noise = i => (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 * 0.004 - 0.002;
  const cols = ['speed[km/h]', `steer[${steerUnit}]`, `accy[${accyUnit}]`, 'yaw[deg/s]', 'trvdam_fl[mm]', 'trvdam_fr[mm]'];
  if (withTime) cols.unshift('time[s]');
  const rows = [cols.join(',')]; let k = 0, t = 0;
  const levels = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4];
  for (let rep = 0; rep < 2; rep++) for (let li = 0; li < levels.length; li++) {
    const v = 24 + li * 2 + rep, lvl = levels[li];
    for (let s = 0; s < 60; s++, k++) {
      const sideLeft = (rep === 0);                         // rep0 = left turns (+ay), rep1 = right (-ay)
      const kUse = (leftKus != null) ? (sideLeft ? leftKus : kus) : kus;
      const ay = lvl + noise(k), R = v * v / (ay * G);
      const deltaDeg = (L / R) * 180 / Math.PI + kUse * ay;          // road-wheel deg
      let steerOut = deltaDeg * ratio; if (steerUnit === 'rad') steerOut = deltaDeg * Math.PI / 180 * ratio;
      const ayOut = accyUnit.includes('m/s') ? ay * G : ay;
      const sgn = sideLeft ? 1 : -1;
      const rollDeg = roll * ay, wheelDiff = Math.tan(rollDeg * Math.PI / 180) * tF, damperDiff = wheelDiff / MR;
      const yawOut = (v ? (ay * G / v) : 0) * 180 / Math.PI;          // r = ay/v (rough)
      const time = (t += 0.02);
      const tt = (gap && k === 700) ? time + 5 : time;               // inject a gap
      const r = [(v * 3.6).toFixed(2), (sgn * steerOut).toFixed(4), (sgn * ayOut).toFixed(4), (sgn * yawOut).toFixed(3), (sgn * damperDiff / 2).toFixed(3), (-sgn * damperDiff / 2).toFixed(3)];
      if (withTime) r.unshift(tt.toFixed(2));
      rows.push(r.join(','));
    }
  }
  return rows.join('\n');
}

const FULL_CONFIG = {
  channels: {
    speed: { column: 'speed', unit: 'km/h', source: 'wheel_fusion', confirmed: true },
    steer: { column: 'steer', meaning: 'steering_wheel_angle', unit: 'deg', sign: 1, offset_deg: 0, steering_ratio: 12.5, ratio_definition: 'wheel_per_roadwheel', front_angle_basis: 'bicycle_equivalent', confirmed: true },
    accy: { column: 'accy', unit: 'g', sign: 1, offset: 0, gravity_compensated: true, confirmed: true },
    yaw: { column: 'yaw', is_rate: true, unit: 'deg/s', sign: 1, offset: 0, confirmed: true },
    damper_fl: { column: 'trvdam_fl', meaning: 'damper_displacement', unit: 'mm', sign: 1, zero: 0, confirmed: true },
    damper_fr: { column: 'trvdam_fr', meaning: 'damper_displacement', unit: 'mm', sign: 1, zero: 0, confirmed: true },
  },
  motion_ratio: { front: 1.39, rear: 1.30, definition: 'damper_over_wheel' },
  geometry: { wheelbase_mm: 2800, front_track_mm: 1595, rear_track_mm: 1540 },
};

function selftest() {
  let pass = 0, fail = 0;
  const chk = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? '  ' + d : '')); } };
  const opt = { filter: { ...DEFAULT_FILTER }, speedTarget: 100, csvName: 'synthetic', configName: 'test' };
  console.log('=== SELF-TEST ===');

  // 1. math recovery with FULL config → confirmed + correct value
  let tel = parseCsv(makeCsv(1.5, 0.65));
  let tb = timebaseReport(tel);
  let us = measuredUndersteer(tel, FULL_CONFIG, tb, opt.filter);
  chk('full-config: K_us grade=confirmed', us.grade === GRADE.DEFINITION_CONFIRMED, us.grade);
  chk('full-config: K_us ≈ 1.5 (got ' + (us.combined != null ? us.combined.toFixed(3) : 'n/a') + ')', us.available && Math.abs(us.combined - 1.5) < 0.05);
  chk('full-config: measured_Kus_available = true', us.available === true);

  // 2. NO config → provisional + not available + assumptions flagged
  let us2 = measuredUndersteer(tel, {}, tb, opt.filter);
  chk('no-config: K_us grade=provisional', us2.grade === 'provisional', us2.grade);
  chk('no-config: measured_Kus_available = false (fail-closed)', us2.available === false);
  chk('no-config: lists ASSUMED definitions', us2.assumed && us2.assumed.length > 0, JSON.stringify(us2.assumed));

  // 3. unknown unit → blocked
  let telBad = parseCsv(makeCsv(1.5, 0.65).replace('accy[g]', 'accy[counts]'));
  let us3 = measuredUndersteer(telBad, {}, timebaseReport(telBad), opt.filter);
  chk('unknown accy unit → blocked', us3.grade === 'blocked', us3.grade);

  // 4. left/right asymmetry flagged
  let telA = parseCsv(makeCsv(1.5, 0.65, { leftKus: 0.3 }));   // left 0.3, right 1.5
  let usA = measuredUndersteer(telA, FULL_CONFIG, timebaseReport(telA), opt.filter);
  chk('left/right asymmetry detected', usA.asymWarn === true, 'left=' + usA.left + ' right=' + usA.right);

  // 5. timebase reset → blocked
  let telG = parseCsv(makeCsv(1.5, 0.65, { withTime: true }).split('\n').map((l, i) => i === 705 ? l.replace(/^[\d.]+/, '0.10') : l).join('\n'));
  let tbG = timebaseReport(telG);
  chk('timebase reset → status blocked', tbG.status === 'blocked', tbG.status + ' ' + tbG.reason.join(';'));
  let usG = measuredUndersteer(telG, FULL_CONFIG, tbG, opt.filter);
  chk('timebase blocked → K_us blocked', usG.grade === 'blocked');

  // 6. roll never auto-confirmed; raw diff available, body-roll only with explicit enable
  let roll = measuredRoll(tel, FULL_CONFIG, tb, opt.filter);
  chk('roll grade=provisional (never auto-confirmed)', roll.grade === 'provisional', roll.grade);
  chk('roll: measured_roll_gradient_available = false', roll.available === false);
  chk('roll: raw L-R diff slope present', typeof roll.rawDiffSlope === 'number');
  let roll2 = measuredRoll(tel, { ...FULL_CONFIG, roll_model: { body_roll_from_front_damper: true } }, tb, opt.filter);
  chk('roll: body-roll only when explicitly enabled', roll2.bodyRollGradient != null && roll.bodyRollGradient == null);

  // 7. model still loads
  chk('app model loads', modelUndersteer(F312_MODEL_SETUP).ok);

  console.log('\nself-test: ' + pass + ' passed, ' + fail + ' failed');
  return fail === 0;
}

function helpConfig() {
  console.log(JSON.stringify({
    channels: {
      speed: { column: 'speed', unit: 'km/h', source: 'wheel_fusion|gps|estimate', confirmed: true },
      steer: { column: 'steer', meaning: 'steering_wheel_angle|road_wheel_angle', unit: 'deg|rad', sign: 1, offset_deg: 0, steering_ratio: 12.5, ratio_definition: 'wheel_per_roadwheel', front_angle_basis: 'bicycle_equivalent|average|inner|outer', confirmed: true },
      accy: { column: 'accy', unit: 'g|m/s2', sign: 1, offset: 0, gravity_compensated: true, confirmed: true },
      yaw: { column: 'yaw', is_rate: true, unit: 'deg/s|rad/s', sign: 1, offset: 0, confirmed: true },
      damper_fl: { column: 'trvdam_fl', meaning: 'damper_displacement|wheel_travel', unit: 'mm', sign: 1, zero: 0, confirmed: true },
      damper_fr: { column: 'trvdam_fr', meaning: 'damper_displacement', unit: 'mm', sign: 1, zero: 0, confirmed: true },
    },
    motion_ratio: { front: 1.39, rear: 1.30, definition: 'damper_over_wheel|wheel_over_damper' },
    geometry: { wheelbase_mm: 2800, front_track_mm: 1595, rear_track_mm: 1540 },
    roll_model: { body_roll_from_front_damper: false },
  }, null, 2));
  console.log('\nNote: only fields present with the parent channel "confirmed": true count as confirmed.');
  console.log('Anything taken from the CSV header or a default is ASSUMED → the metric is PROVISIONAL.');
  console.log('Do NOT hardcode unconfirmed values as if confirmed.');
}

function main() {
  const argv = process.argv.slice(2);
  const opt = { filter: { ...DEFAULT_FILTER }, speedTarget: 100, csvName: null, configName: null };
  let csvPath = null, cfgPath = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') process.exit(selftest() ? 0 : 1);
    else if (a === '--help-config') { helpConfig(); process.exit(0); }
    else if (a === '--config') { cfgPath = argv[++i]; }
    else if (a === '--ay-min') opt.filter.minAy_g = parseFloat(argv[++i]);
    else if (a === '--min-speed') opt.filter.minSpeed_ms = parseFloat(argv[++i]);
    else if (a === '--max-day') opt.filter.maxDAyDt_g_s = parseFloat(argv[++i]);
    else if (a === '--max-dsteer') opt.filter.maxDSteer_dps = parseFloat(argv[++i]);
    else if (a === '--max-brake') opt.filter.maxBrake = parseFloat(argv[++i]);
    else if (a === '--speed-target') opt.speedTarget = parseFloat(argv[++i]);
    else csvPath = a;
  }
  if (!csvPath) { console.log('usage: validate-against-telemetry.js <csv> [--config defs.json] [--ay-min .3] [--min-speed 8] [--max-day 4] [--max-dsteer 60] [--max-brake N]\n       validate-against-telemetry.js --selftest | --help-config'); process.exit(2); }
  let cfg = {}; if (cfgPath) { try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); opt.configName = path.basename(cfgPath); } catch (e) { console.error('config parse error:', e.message, '— treating as no config (fail-closed)'); } }
  opt.csvName = path.basename(csvPath);
  report(parseCsv(fs.readFileSync(csvPath, 'utf8')), cfg, opt);
}
main();
