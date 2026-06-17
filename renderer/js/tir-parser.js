/**
 * tir-parser.js — Pacejka Magic Formula (.tir) importer + pure-slip lateral evaluator
 *
 * Parses a standard MF-Tyre / MF-Swift .tir property file (FILE_FORMAT='ASCII',
 * MF 6.1 / 6.2, FITTYP 6x) and evaluates the pure-slip LATERAL force Fy0(α, Fz, γ).
 * The .tir format is an open, human-readable standard — this module reads a file the
 * USER supplies at runtime; no tire dataset is bundled with the app.
 *
 * Reference: H.B. Pacejka, "Tire and Vehicle Dynamics" 3rd ed. / MF-Tyre 6.1 eqns.
 * We implement the pure-slip lateral set (Fy0); combined slip / Mz are out of scope here.
 *
 * Usage:
 *   const t = parseTIR(fileText);
 *   const fy = mfFy0(t, alphaRad, Fz, gammaRad);          // lateral force [N]
 *   const c  = tireCharacteristics(t, { pressurePa });     // peak μ, Cα, etc.
 */

/** Parse "KEY = value $comment" / "KEY ='string'" lines into a flat map. */
function parseTIR(text) {
  const num = {};   // numeric coefficients
  const str = {};   // string fields
  let section = '';
  const lineRe = /^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '!' || line[0] === '$') continue;
    const sec = line.match(/^\[([A-Z0-9_]+)\]/);
    if (sec) { section = sec[1]; continue; }
    const m = raw.match(lineRe);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/\$.*$/, '').trim();        // strip trailing $comment
    if (/^'.*'$/.test(val)) { str[key] = val.slice(1, -1); continue; }
    const f = parseFloat(val);
    if (!Number.isNaN(f) && /^[-+0-9.eE]+$/.test(val)) num[key] = f;
    else if (val) str[key] = val;
  }
  const C = (k, d = 0) => (k in num ? num[k] : d);
  const parsed = {
    raw: num, strRaw: str,
    name: str.FILE_NAME || str.COMMENT || '',
    mfVersion: str.TIRE_VERSION || ('FITTYP ' + C('FITTYP')),
    fitTyp: C('FITTYP'),
    dims: {
      unloadedRadius_m: C('UNLOADED_RADIUS'),
      width_m: C('WIDTH'),
      aspect: C('ASPECT_RATIO'),
      rimRadius_m: C('RIM_RADIUS'),
    },
    Fnom: C('FNOMIN', 3000),
    nomPres_pa: C('NOMPRES', C('INFLPRES', 0)) || 0,
    inflPres_pa: C('INFLPRES', C('NOMPRES', 0)) || 0,
    verticalStiffness_Npm: C('VERTICAL_STIFFNESS', 0),
    verticalStiffness_Nmm: C('VERTICAL_STIFFNESS', 0) / 1000,
  };
  return parsed;
}

/**
 * MF 6.1 pure-slip lateral force Fy0 [N] (ISO sign convention).
 * @param {object} t      parsed tire (from parseTIR)
 * @param {number} alpha  slip angle [rad]
 * @param {number} Fz     vertical load [N] (>0)
 * @param {number} gamma  inclination/camber angle [rad] (default 0)
 * @param {number} presPa inflation pressure [Pa] (default tire's INFLPRES/NOMPRES)
 */
function mfFy0(t, alpha, Fz, gamma = 0, presPa) {
  const C = (k, d = 0) => (k in t.raw ? t.raw[k] : d);
  if (!(Fz > 0)) return 0;

  // scaling factors (default 1)
  const LFZO = C('LFZO', 1), LCY = C('LCY', 1), LMUY = C('LMUY', 1),
        LEY = C('LEY', 1), LKY = C('LKY', 1), LHY = C('LHY', 1),
        LVY = C('LVY', 1), LKYC = C('LKYC', C('LGAY', 1)), LMUYscl = 1;

  const Fz0p = (t.Fnom || 3000) * LFZO;          // scaled nominal load
  const dfz = (Fz - Fz0p) / Fz0p;

  // pressure variation dpi (0 when no pressure data)
  const pi0 = t.nomPres_pa || 0;
  const pi = (presPa != null ? presPa : (t.inflPres_pa || pi0)) || 0;
  const dpi = pi0 > 0 ? (pi - pi0) / pi0 : 0;

  const gy = gamma; // camber

  const SHy = (C('PHY1') + C('PHY2') * dfz) * LHY;
  const ay = alpha + SHy;

  const Cy = C('PCY1') * LCY;
  let muy = (C('PDY1') + C('PDY2') * dfz) * (1 + C('PPY3') * dpi + C('PPY4') * dpi * dpi)
            * (1 - C('PDY3') * gy * gy) * LMUY;
  const Dy = muy * Fz;                            // ζ2 = 1 (no turn slip)

  let Ey = (C('PEY1') + C('PEY2') * dfz)
           * (1 + C('PEY5') * gy * gy - (C('PEY3') + C('PEY4') * gy) * Math.sign(ay || 1)) * LEY;
  if (Ey > 1) Ey = 1;

  // cornering stiffness at αy=0:  Kya = PKY1·Fz0'·(1+PPY1·dpi)·(1-PKY3|γ|)·sin(PKY4·atan( Fz/Fz0' / ((PKY2+PKY5γ²)(1+PPY2·dpi)) ))·LKY
  const denom = (C('PKY2') + C('PKY5') * gy * gy) * (1 + C('PPY2') * dpi);
  const Kya = C('PKY1') * Fz0p * (1 + C('PPY1') * dpi) * (1 - C('PKY3') * Math.abs(gy))
              * Math.sin(C('PKY4') * Math.atan((Fz / Fz0p) / (denom || 1e-9))) * LKY;

  const eps = 1e-6;
  const By = Kya / (Cy * Dy + (Dy >= 0 ? eps : -eps));

  const SVyg = Fz * (C('PVY3') + C('PVY4') * dfz) * gy * LKYC * LMUY;
  const SVy = Fz * (C('PVY1') + C('PVY2') * dfz) * LVY * LMUY + SVyg;

  const Fy0 = Dy * Math.sin(Cy * Math.atan(By * ay - Ey * (By * ay - Math.atan(By * ay)))) + SVy;
  return Fy0;
}

/** Cornering stiffness magnitude at α=0 [N/rad] (finite-difference of Fy0). */
function corneringStiffness_Nrad(t, Fz, gamma = 0, presPa) {
  const h = 1e-4; // rad
  const f1 = mfFy0(t, h, Fz, gamma, presPa);
  const f0 = mfFy0(t, -h, Fz, gamma, presPa);
  return Math.abs((f1 - f0) / (2 * h));
}

/**
 * Derived tire characteristics from the real model.
 * @returns peak μ, optimal slip angle, cornering stiffness (N/deg) at a load,
 *          vertical stiffness, and μ-vs-load + Fy(α) sample curves.
 */
function tireCharacteristics(t, opts = {}) {
  const Fz = opts.Fz || t.Fnom || 3000;
  const gamma = opts.gamma || 0;
  const presPa = opts.pressurePa;

  // sweep slip angle to find peak |Fy| and optimal angle
  let peakFy = 0, optAlpha = 0;
  const fyCurve = [];
  for (let degx = 0; degx <= 15; degx += 0.25) {
    const a = degx * Math.PI / 180;
    const fy = Math.abs(mfFy0(t, a, Fz, gamma, presPa));
    fyCurve.push({ alpha_deg: degx, fy_N: Math.round(mfFy0(t, a, Fz, gamma, presPa)) });
    if (fy > peakFy) { peakFy = fy; optAlpha = degx; }
  }
  const peakMu = peakFy / Fz;

  // μ vs load curve (load sensitivity) — peak μ at several Fz
  const muVsLoad = [];
  const fzMax = (t.raw.FZMAX || (t.Fnom * 2.5)) || 7500;
  for (let fz = Math.max(200, t.Fnom * 0.25); fz <= fzMax; fz += t.Fnom * 0.25) {
    let pk = 0;
    for (let degx = 1; degx <= 14; degx += 0.5) {
      const fy = Math.abs(mfFy0(t, degx * Math.PI / 180, fz, gamma, presPa));
      if (fy > pk) pk = fy;
    }
    muVsLoad.push({ Fz_N: Math.round(fz), mu: +(pk / fz).toFixed(3) });
  }

  const Ca_Nrad = corneringStiffness_Nrad(t, Fz, gamma, presPa);
  return {
    name: t.name,
    mfVersion: t.mfVersion,
    dims: t.dims,
    Fnom_N: t.Fnom,
    verticalStiffness_Nmm: +t.verticalStiffness_Nmm.toFixed(1),
    inflationPressure_bar: t.inflPres_pa ? +(t.inflPres_pa / 1e5).toFixed(2) : null,
    peakMu: +peakMu.toFixed(3),
    optimalSlipAngle_deg: optAlpha,
    corneringStiffness_Ndeg: Math.round(Ca_Nrad * Math.PI / 180),
    muVsLoad,
    fyCurve,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseTIR, mfFy0, corneringStiffness_Nrad, tireCharacteristics };
}
