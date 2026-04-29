/**
 * 粒子运动方程。
 * 输入参数 t 为归一化时间（0 → 1 对应 0 → d/v₀），
 *           α 为初速度方向与 +x 轴夹角，α ∈ [0, π/2]。
 * 返回归一化坐标 (x, y, z) （以 d 为单位）。
 *
 * 推导：
 *   v(0) = v₀ (cos α, sin α, 0)
 *   xy 平面：以圆心 C = (r sin α, −r cos α, 0) 为中心顺时针圆周（俯视 +z 看）。
 *   z 方向：z = ½ a t² = (v₀² / d) t²，归一化后 z = t²。
 */

import { PHYS } from "./config.js";

/**
 * 在归一化时间 τ ∈ [0, 1] 时刻粒子位置（归一化坐标）。
 * @param {number} alpha  初速度方向角 (rad)
 * @param {number} tau    归一化时间 [0, 1]
 * @returns {{x:number, y:number, z:number}}
 */
export function particlePosition(alpha, tau) {
  const r = PHYS.r;
  const cx = r * Math.sin(alpha);
  const cy = -r * Math.cos(alpha);

  // 起始时从圆心出发到粒子的相位 = π/2 + α，
  // 顺时针旋转 ωt = (2π/3) τ
  const phase = Math.PI / 2 + alpha - PHYS.totalAngle * tau;

  const x = cx + r * Math.cos(phase);
  const y = cy + r * Math.sin(phase);
  const z = tau * tau; // 归一化 z = (v₀ t / d)² = τ²

  return { x, y, z };
}

/**
 * 在归一化时间 τ 时刻粒子速度方向（未归一化的速度向量，单位 v₀）。
 * 用于绘制速度箭头与受力。
 */
export function particleVelocity(alpha, tau) {
  const r = PHYS.r;
  const phase = Math.PI / 2 + alpha - PHYS.totalAngle * tau;

  // d/dτ 的位置 → 转化为以 v0 为单位的速度（量纲：r·ω/(d/v0)·v0/d ...）
  // 直接由角速度构造：xy 切向速度大小 = v₀
  // 切向方向 = 顺时针旋转的相位的切向 = (-sin phase, cos phase) · (-1)（顺时针）
  // 即 (sin phase, -cos phase)
  const vx = Math.sin(phase);   // 与 v₀ 同尺度
  const vy = -Math.cos(phase);
  const vz = 2 * tau;           // dz/dτ = 2τ，最终时刻 vz = 2 v₀

  return { vx, vy, vz };
}

/**
 * 落屏点（τ = 1）解析公式：
 *   x = √3 r sin(α + π/6)
 *   y = √3 r sin(α − π/3)
 */
export function impactPoint(alpha) {
  const r = PHYS.r;
  const x = Math.sqrt(3) * r * Math.sin(alpha + Math.PI / 6);
  const y = Math.sqrt(3) * r * Math.sin(alpha - Math.PI / 3);
  return { x, y, z: 1 };
}

/**
 * 给定 α，是否打到 y > 0 的荧光屏上（含 y = 0 边界视为不打中）。
 */
export function hitsScreen(alpha) {
  return alpha > Math.PI / 3 + 1e-9;
}

/**
 * 给定 α 序列，预生成轨迹折线（归一化坐标）。
 * @param {number} alpha
 * @param {number} segments
 * @returns {Array<{x:number,y:number,z:number}>}
 */
export function trajectoryPoints(alpha, segments = 96) {
  const pts = new Array(segments + 1);
  for (let i = 0; i <= segments; i++) {
    pts[i] = particlePosition(alpha, i / segments);
  }
  return pts;
}

/**
 * 计算亮线已成形长度（按当前归一化时间 τ）：
 *   只有当 τ = 1 时所有满足条件的 α 都已击中，
 *   τ < 1 时按 α 越大、击中越晚（实际上同步击中），
 *   动画中我们取击屏的归一化时间 = 1，τ < 1 时 L = 0。
 *
 * 但为更直观演示，我们按"扫过角"等比给出："时间内已经成形的弧长"。
 * 这里返回当前已击中的最大与最小 α 对应的弧长。
 */
export function brightLineLength(tauMaxHit) {
  // tauMaxHit ∈ [0, 1]：当前所有粒子的飞行进度（同步），
  // 击屏发生在 τ = 1 时刻，因此 L 为阶跃函数。这里我们用平滑的指示函数，
  // 让用户在 τ ∈ [0.92, 1] 区间看到亮线"逐步绘制"，仅做视觉提示。
  if (tauMaxHit < 0.92) return 0;
  const t = (tauMaxHit - 0.92) / 0.08;
  return Math.min(1, t) * (Math.sqrt(3) / 4);
}
