/**
 * kinematics.js — 2D front-view double-wishbone suspension kinematics (clean-room, first principles)
 *
 * Computes, from suspension HARDPOINTS the user enters at runtime:
 *   - Instant Center (IC) — intersection of the two control-arm lines
 *   - Roll Center height (RC) — where the contact-patch→IC line crosses the car centerline
 *   - Camber and camber-gain through bump/droop travel (rigid-upright linkage solve)
 *   - Roll-center migration through travel
 *
 * Coordinates: front view, y = lateral [mm] (0 at car centerline, + toward the wheel),
 *              z = vertical [mm] (0 at ground). One corner.
 * Reference: Milliken & Milliken ch.17 (suspension geometry); standard 2D wishbone construction.
 * Nothing proprietary is bundled — the user supplies their own hardpoints.
 */

function _sub(a, b) { return { y: a.y - b.y, z: a.z - b.z }; }
function _len(a, b) { return Math.hypot(a.y - b.y, a.z - b.z); }

/** Intersection of line(p1,p2) and line(p3,p4). Returns {y,z} or null if parallel. */
function lineIntersect(p1, p2, p3, p4) {
  const d1 = _sub(p2, p1), d2 = _sub(p4, p3);
  const den = d1.y * d2.z - d1.z * d2.y;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((p3.y - p1.y) * d2.z - (p3.z - p1.z) * d2.y) / den;
  return { y: p1.y + t * d1.y, z: p1.z + t * d1.z };
}

/** Circle-circle intersections; returns array of 0/1/2 points. */
function circleIntersect(c1, r1, c2, r2) {
  const dy = c2.y - c1.y, dz = c2.z - c1.z;
  const d = Math.hypot(dy, dz);
  if (d < 1e-9 || d > r1 + r2 + 1e-6 || d < Math.abs(r1 - r2) - 1e-6) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;
  const h = h2 > 0 ? Math.sqrt(h2) : 0;
  const my = c1.y + a * dy / d, mz = c1.z + a * dz / d;
  const ox = -dz / d * h, oz = dy / d * h;
  return [{ y: my + ox, z: mz + oz }, { y: my - ox, z: mz - oz }];
}

/** Camber [deg] = tilt of the upright (LBJ→UBJ) from vertical. + = top leans outboard (positive camber). */
function uprightAngleDeg(lbj, ubj) {
  return Math.atan2(ubj.y - lbj.y, ubj.z - lbj.z) * 180 / Math.PI;
}

/** Rotate point p about center c by angleRad. */
function rotateAbout(p, c, angleRad) {
  const s = Math.sin(angleRad), co = Math.cos(angleRad);
  const dy = p.y - c.y, dz = p.z - c.z;
  return { y: c.y + dy * co - dz * s, z: c.z + dy * s + dz * co };
}

/**
 * Static geometry from hardpoints.
 * hp: { lai, lbj, uai, ubj, wc, cp }  (each {y,z} in mm)
 * staticCamberDeg: the wheel's aligned camber (optional, default 0) — kinematics adds the change.
 */
function solveStatic(hp, staticCamberDeg = 0) {
  const ic = lineIntersect(hp.lai, hp.lbj, hp.uai, hp.ubj);
  let rcHeight = null;
  if (ic) {
    // RC = z where line(cp, ic) crosses y = 0
    const denom = (ic.y - hp.cp.y);
    if (Math.abs(denom) > 1e-9) {
      const t = (0 - hp.cp.y) / denom;
      rcHeight = hp.cp.z + t * (ic.z - hp.cp.z);
    }
  }
  return {
    instantCenter: ic,
    rollCenterHeight_mm: rcHeight != null ? +rcHeight.toFixed(1) : null,
    uprightAngle_deg: +uprightAngleDeg(hp.lbj, hp.ubj).toFixed(3),
    staticCamber_deg: staticCamberDeg,
  };
}

/**
 * Solve the linkage at a target wheel vertical travel dz [mm] (+ = bump).
 * LBJ rides circle(LAi, |LAi-LBJ|); UBJ rides circle(UAi, |UAi-UBJ|);
 * |LBJ-UBJ| fixed; WC/CP rigidly attached to the upright. Root-find the lower-arm
 * angle so the wheel-center rises by dz. Returns the moved hardpoints + camber/RC.
 */
function solveAtTravel(hp, dz, staticCamberDeg = 0) {
  const Rl = _len(hp.lai, hp.lbj);
  const Ru = _len(hp.uai, hp.ubj);
  const Lup = _len(hp.lbj, hp.ubj);
  const phi0 = Math.atan2(hp.lbj.z - hp.lai.z, hp.lbj.y - hp.lai.y);
  const targetWcZ = hp.wc.z + dz;

  // For a lower-arm angle phi, place LBJ, then UBJ (circle-circle near original), then WC by rigid rotation.
  function place(phi) {
    const lbj = { y: hp.lai.y + Rl * Math.cos(phi), z: hp.lai.z + Rl * Math.sin(phi) };
    const cand = circleIntersect(hp.uai, Ru, lbj, Lup);
    if (!cand.length) return null;
    const ubj = (_len(cand[0], hp.ubj) <= _len(cand[1] || cand[0], hp.ubj)) ? cand[0] : cand[1];
    // rigid-body rotation of the upright: angle of (UBJ-LBJ) now vs originally
    const a0 = Math.atan2(hp.ubj.z - hp.lbj.z, hp.ubj.y - hp.lbj.y);
    const a1 = Math.atan2(ubj.z - lbj.z, ubj.y - lbj.y);
    const rot = a1 - a0;
    // translate upright so LBJ matches, then rotate WC/CP about LBJ by rot
    const wc0t = { y: hp.wc.y + (lbj.y - hp.lbj.y), z: hp.wc.z + (lbj.z - hp.lbj.z) };
    const cp0t = { y: hp.cp.y + (lbj.y - hp.lbj.y), z: hp.cp.z + (lbj.z - hp.lbj.z) };
    const wc = rotateAbout(wc0t, lbj, rot);
    const cp = rotateAbout(cp0t, lbj, rot);
    return { lbj, ubj, wc, cp, rot };
  }

  // Clamped Newton from phi0 → converges to the root NEAREST the operating point,
  // i.e. the continuous linkage branch (avoids jumping to the folded second solution).
  const f = (phi) => { const p = place(phi); return p ? p.wc.z - targetWcZ : NaN; };
  let phi = phi0;
  for (let i = 0; i < 50; i++) {
    const fv = f(phi);
    if (!Number.isFinite(fv) || Math.abs(fv) < 1e-4) break;
    const h = 1e-4;
    const f2 = f(phi + h);
    if (!Number.isFinite(f2)) break;
    const dfv = (f2 - fv) / h;
    if (Math.abs(dfv) < 1e-9) break;
    let dphi = fv / dfv;
    if (dphi > 0.05) dphi = 0.05; else if (dphi < -0.05) dphi = -0.05; // stay on branch
    phi -= dphi;
  }
  const p = place(phi);
  return p ? _result(hp, p, staticCamberDeg) : null;
}

function _result(hp, p, staticCamberDeg) {
  const ic = lineIntersect(hp.lai, p.lbj, hp.uai, p.ubj);
  let rc = null;
  if (ic && Math.abs(ic.y - p.cp.y) > 1e-9) {
    const t = (0 - p.cp.y) / (ic.y - p.cp.y);
    rc = p.cp.z + t * (ic.z - p.cp.z);
  }
  const camberChange = uprightAngleDeg(p.lbj, p.ubj) - uprightAngleDeg(hp.lbj, hp.ubj);
  return {
    rollCenterHeight_mm: rc != null ? +rc.toFixed(1) : null,
    camber_deg: +(staticCamberDeg + camberChange).toFixed(3),
    camberChange_deg: +camberChange.toFixed(3),
    wc_z: +p.wc.z.toFixed(2),
  };
}

/**
 * Bump/droop sweep → camber-gain & RC-migration curves.
 * @returns { static, curve:[{dz, camber_deg, camberChange_deg, rollCenterHeight_mm}], camberGain_deg_per_mm }
 */
function kinematicsSweep(hp, opts = {}) {
  const staticCamber = opts.staticCamberDeg || 0;
  const range = opts.travel_mm || 40;     // ± travel
  const step = opts.step_mm || 5;
  const stat = solveStatic(hp, staticCamber);
  const curve = [];
  for (let dz = -range; dz <= range + 1e-9; dz += step) {
    const r = solveAtTravel(hp, dz, staticCamber);
    if (r) curve.push({ dz_mm: +dz.toFixed(1), camber_deg: r.camber_deg, camberChange_deg: r.camberChange_deg, rollCenterHeight_mm: r.rollCenterHeight_mm });
  }
  // camber gain near ride height (central difference over ±step)
  const up = solveAtTravel(hp, step, staticCamber);
  const dn = solveAtTravel(hp, -step, staticCamber);
  const camberGain = (up && dn) ? +((up.camberChange_deg - dn.camberChange_deg) / (2 * step)).toFixed(4) : null;
  return { static: stat, curve, camberGain_deg_per_mm: camberGain };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { lineIntersect, circleIntersect, solveStatic, solveAtTravel, kinematicsSweep };
}
