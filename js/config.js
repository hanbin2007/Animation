/**
 * 物理与场景常量。
 * 为可视化采用归一化单位 d = 1, v0 = 1。
 *
 * 由原题给出条件：
 *   E = 2 m v0² / (d q)   →  a = qE/m = 2 v0² / d
 *   B = 2π m v0 / (3 d q) →  ω = qB/m = 2π v0 / (3 d)
 *   r = m v0 / (q B) = 3 d / (2π)
 *   T = 2π / ω = 3 d / v0
 *
 * 到达 z = d 的时间： d = ½ a t²  →  t = d / v0
 * 期间 xy 平面转角： ω t = 2π / 3   （即 1/3 周）
 */

export const PHYS = {
  d: 1,
  v0: 1,

  // 派生量
  a: 2,                // 2 v0² / d
  r: 3 / (2 * Math.PI),                     // ≈ 0.4775
  T: 3,                                     // 3 d / v0
  omega: (2 * Math.PI) / 3,                 // 2π / 3
  tFinal: 1,                                // d / v0
  totalAngle: (2 * Math.PI) / 3,            // 120°
  locusRadius: Math.sqrt(3) * 3 / (2 * Math.PI), // √3 · r
  arcAngle: Math.PI / 6,                    // 30°
  arcLength: Math.sqrt(3) / 4,              // √3 / 4 · d
};

export const VISUAL = {
  // 场景缩放：把 d=1 渲染为 4 个三维单位，便于观察细节
  unit: 4,

  // 颜色
  colors: {
    bg: 0x05060d,
    axisX: 0xff6b6b,
    axisY: 0x65e0a3,
    axisZ: 0x6ad1ff,
    eField: 0xff8c5a,
    bField: 0x6ad1ff,
    source: 0xffd166,
    screen: 0xb794ff,
    screenEdge: 0xc8b6ff,
    locus: 0x9aa6c8,
    bright: 0xff6e8a,
    particleHi: 0xff6e8a,   // 单粒子聚焦色
    particleLo: 0x6ad1ff,
  },

  particleSize: 0.06,
  trailWidth: 0.012,
  screenWidth: 5,        // 在场景单位上的尺寸（与 unit 配合）
  screenDepth: 4,
};

export const ANIM = {
  defaultCount: 31,            // 同时显示的粒子数
  defaultSpeed: 1.0,           // 倍率
  fadeAfter: 0.18,             // 击屏后亮线节点显现节奏
};
