/**
 * transient.js — 2-DOF linear bicycle transient response (clean-room, first principles)
 *
 * Step-steer response of the classic single-track (bicycle) model: how yaw rate builds
 * up over time, its overshoot, response time, natural frequency and damping — the
 * transient behaviour that separates a quasi-static model from a dynamic one.
 *
 * State x = [β (sideslip, rad), r (yaw rate, rad/s)];  input = front steer δ (rad), speed V (m/s).
 * Reference: Milliken & Milliken RCVD ch.5–6; Gillespie, Fundamentals of Vehicle Dynamics ch.6
 *   m·V·(β̇ + r) = -Cf·(β + a·r/V − δ) − Cr·(β − b·r/V)
 *   Iz·ṙ        = -a·Cf·(β + a·r/V − δ) + b·Cr·(β − b·r/V)
 * Cf, Cr = axle cornering stiffness [N/rad] (positive); a,b = CG→front / CG→rear [m].
 */

/** Estimate yaw inertia [kg·m²] from mass and CG geometry (dynamic index ≈ 1). */
function estimateIz(mass, a, b) { return mass * a * b; }

function transient2DOF(p) {
  const { mass, Iz, a, b, Cf, Cr, V, steer } = p;
  if (!(V > 1) || !(mass > 0) || !(Iz > 0) || !(Cf > 0) || !(Cr > 0)) return null;
  const dt = p.dt || 0.002, T = p.T || 2.0;

  // state-space ẋ = A·x + B·δ
  const A11 = -(Cf + Cr) / (mass * V);
  const A12 = (b * Cr - a * Cf) / (mass * V * V) - 1;
  const A21 = (b * Cr - a * Cf) / Iz;
  const A22 = -(a * a * Cf + b * b * Cr) / (Iz * V);
  const B1 = Cf / (mass * V);
  const B2 = a * Cf / Iz;
  const deriv = (be, rr) => [A11 * be + A12 * rr + B1 * steer, A21 * be + A22 * rr + B2 * steer];

  let beta = 0, r = 0, rMax = 0;
  const curve = [];
  const sampleEvery = Math.max(1, Math.round(0.05 / dt));
  const n = Math.round(T / dt);
  for (let i = 0; i <= n; i++) {
    const t = i * dt;
    if (i % sampleEvery === 0) curve.push({ t_s: +t.toFixed(3), yaw_rate_deg_s: +(r * 180 / Math.PI).toFixed(3) });
    if (Math.abs(r) > Math.abs(rMax)) rMax = r;
    const k1 = deriv(beta, r);
    const k2 = deriv(beta + 0.5 * dt * k1[0], r + 0.5 * dt * k1[1]);
    const k3 = deriv(beta + 0.5 * dt * k2[0], r + 0.5 * dt * k2[1]);
    const k4 = deriv(beta + dt * k3[0], r + dt * k3[1]);
    beta += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    r += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }
  const rSteady = r;                                  // settled value at T
  const rSteadyDeg = rSteady * 180 / Math.PI;

  // response time: first time |r| reaches 90% of steady
  let t90 = null;
  for (const pt of curve) { if (rSteadyDeg !== 0 && Math.abs(pt.yaw_rate_deg_s) >= 0.9 * Math.abs(rSteadyDeg)) { t90 = pt.t_s; break; } }
  const overshoot = rSteady !== 0 ? Math.max(0, (Math.abs(rMax) - Math.abs(rSteady)) / Math.abs(rSteady) * 100) : 0;

  // yaw-mode eigenvalues of A → natural frequency + damping ratio
  const trA = A11 + A22, detA = A11 * A22 - A12 * A21;
  const wn = detA > 0 ? Math.sqrt(detA) : null;        // undamped natural freq [rad/s]
  const zeta = (wn && wn > 0) ? -trA / (2 * wn) : null;

  return {
    steadyYawRate_deg_s: +rSteadyDeg.toFixed(2),
    yawGain_1_s: steer !== 0 ? +(rSteady / steer).toFixed(3) : null,   // r/δ [1/s]
    responseTime90_s: t90,
    overshoot_pct: +overshoot.toFixed(1),
    naturalFreq_hz: wn ? +(wn / (2 * Math.PI)).toFixed(2) : null,
    dampingRatio: zeta != null ? +zeta.toFixed(2) : null,
    stable: trA < 0 && detA > 0,
    curve,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { transient2DOF, estimateIz };
}
