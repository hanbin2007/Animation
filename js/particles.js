/**
 * 粒子系统 + 轨迹渲染。
 * 设计：
 *   - 在 [0, π/2] 区间均匀采样 N 个 α
 *   - 每个粒子：
 *       · 一颗发光小球
 *       · 一条贝塞尔轨迹（已知 α 即可参数化）
 *   - 全局 τ ∈ [0, 1]，所有粒子同步运动
 *   - τ = 1 时，所有满足 α > π/3 的粒子在屏上的落点形成亮线
 */

import * as THREE from "three";
import { PHYS, VISUAL } from "./config.js";
import { particlePosition, hitsScreen, trajectoryPoints, impactPoint } from "./physics.js";
import { toScene } from "./scene.js";

const U = VISUAL.unit;
const C = VISUAL.colors;

/**
 * 把 α ∈ [0, π/2] 映射到一个柔和的彩虹色（用于多粒子区分）。
 */
function alphaColor(alpha) {
  const t = alpha / (Math.PI / 2);    // 0~1
  // HSL：280° (紫) → 200° (青) → 30° (橙) → 350° (粉)
  const hue = (280 - 280 * t + 350 * t) % 360;
  const col = new THREE.Color().setHSL(hue / 360, 0.7, 0.62);
  return col;
}

class Particle {
  constructor(alpha, color) {
    this.alpha = alpha;
    this.color = color;
    this.hits = hitsScreen(alpha);

    // 小球
    const geo = new THREE.SphereGeometry(VISUAL.particleSize, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geo, mat);

    // 光晕 sprite
    const spriteMat = new THREE.SpriteMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.glow = new THREE.Sprite(spriteMat);
    this.glow.scale.setScalar(0.35);

    // 轨迹线（用 Line 而不是 TubeGeometry，性能更好）
    this.fullPoints = trajectoryPoints(alpha, 96).map(p =>
      toScene(p.x, p.y, p.z)
    );
    const trailGeo = new THREE.BufferGeometry();
    const arr = new Float32Array(this.fullPoints.length * 3);
    trailGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    trailGeo.setDrawRange(0, 0);

    const trailMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.trail = new THREE.Line(trailGeo, trailMat);

    // 落点（屏上的亮点）
    this.dot = null;
    if (this.hits) {
      const dotGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: C.bright });
      this.dot = new THREE.Mesh(dotGeo, dotMat);
      const ip = impactPoint(alpha);
      toScene(ip.x, ip.y, ip.z, this.dot.position);
      this.dot.visible = false;
    }
  }

  /**
   * 设置当前归一化时间 τ ∈ [0, 1]。
   */
  update(tau) {
    const p = particlePosition(this.alpha, tau);
    toScene(p.x, p.y, p.z, this.mesh.position);
    this.glow.position.copy(this.mesh.position);

    // 轨迹：取前 idx 个点 + 当前精确点
    const N = this.fullPoints.length;
    const exactIdx = tau * (N - 1);
    const fullIdx = Math.floor(exactIdx);
    const arr = this.trail.geometry.attributes.position.array;
    let count = 0;
    for (let i = 0; i <= fullIdx; i++) {
      arr[i * 3] = this.fullPoints[i].x;
      arr[i * 3 + 1] = this.fullPoints[i].y;
      arr[i * 3 + 2] = this.fullPoints[i].z;
      count++;
    }
    if (fullIdx < N - 1) {
      arr[count * 3] = this.mesh.position.x;
      arr[count * 3 + 1] = this.mesh.position.y;
      arr[count * 3 + 2] = this.mesh.position.z;
      count++;
    }
    this.trail.geometry.setDrawRange(0, count);
    this.trail.geometry.attributes.position.needsUpdate = true;

    // 落点：τ 接近 1 时显现
    if (this.dot) this.dot.visible = tau > 0.985;
  }

  setHighlight(on) {
    if (on) {
      this.mesh.material.color.set(C.particleHi);
      this.trail.material.opacity = 1.0;
      this.trail.material.color.set(C.particleHi);
    } else {
      this.mesh.material.color.copy(this.color);
      this.trail.material.color.copy(this.color);
      this.trail.material.opacity = 0.7;
    }
  }

  setVisible(v) {
    this.mesh.visible = v;
    this.glow.visible = v;
    this.trail.visible = v;
    if (this.dot) this.dot.visible = this.dot.visible && v;
  }

  setTrailVisible(v) {
    this.trail.visible = v;
  }
}

// =====================================================
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.particles = [];
    this.count = 0;
    this.focusIndex = -1;       // -1 表示无聚焦
    this.tau = 0;
    this.brightArc = null;
    this._buildBrightArc();
  }

  /**
   * 屏上 √3 r 圆从 0° 到 30° 的弧线（亮线本体）。
   * 我们渲染整段，但用 drawRange 控制"已成形"长度。
   */
  _buildBrightArc() {
    const R = PHYS.locusRadius;
    const segs = 64;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * (Math.PI / 6);     // 0 → π/6
      // 亮线对应 (x, y) = (R cos a, R sin a)，z = d
      pts.push(toScene(R * Math.cos(a), R * Math.sin(a), 1));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: C.bright,
      transparent: true,
      opacity: 0.95,
      linewidth: 2,
    });
    const line = new THREE.Line(geo, mat);
    line.geometry.setDrawRange(0, 0);
    this.scene.add(line);

    // 加粗：用一个稍大的 sprite "刷"在屏上
    const tubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      96, 0.04, 8, false
    );
    const tubeMat = new THREE.MeshBasicMaterial({
      color: C.bright,
      transparent: true,
      opacity: 0.85,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.visible = false;
    this.scene.add(tube);

    this.brightArc = { line, tube, segs, fullPoints: pts };
  }

  /**
   * 重设粒子数。
   */
  setCount(n) {
    // 销毁旧粒子
    this.particles.forEach(p => {
      this.group.remove(p.mesh);
      this.group.remove(p.glow);
      this.group.remove(p.trail);
      if (p.dot) this.group.remove(p.dot);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      p.trail.geometry.dispose();
      p.trail.material.dispose();
    });
    this.particles = [];

    // 重建：α 在 [0, π/2] 均匀分布，端点都包含
    for (let i = 0; i < n; i++) {
      const alpha = (i / (n - 1)) * (Math.PI / 2);
      const color = alphaColor(alpha);
      const p = new Particle(alpha, color);
      this.group.add(p.mesh);
      this.group.add(p.glow);
      this.group.add(p.trail);
      if (p.dot) this.group.add(p.dot);
      this.particles.push(p);
    }
    this.count = n;
    this.update(this.tau);
    this._applyFocus();
  }

  /**
   * 设置归一化时间 τ。
   */
  update(tau) {
    this.tau = tau;
    for (const p of this.particles) p.update(tau);

    // 亮线：τ 接近 1 时绘制
    const arc = this.brightArc;
    if (!arc) return;
    let drawRatio = 0;
    if (tau >= 0.985) {
      drawRatio = Math.min(1, (tau - 0.985) / 0.015);
    }
    arc.line.geometry.setDrawRange(0, Math.floor(drawRatio * (arc.segs + 1)));
    arc.tube.visible = drawRatio > 0.0;
    if (drawRatio > 0) {
      // 用 scale 在 v 方向裁剪 tube 是不可行的，简单换做切换可见
      arc.tube.material.opacity = 0.7 * drawRatio;
    }
  }

  /**
   * 单粒子聚焦：传入 alpha (rad)，会找到最接近的粒子并仅显示该粒子。
   * 传入 null 时取消聚焦。
   */
  setFocus(alpha) {
    if (alpha === null || alpha === undefined) {
      this.focusIndex = -1;
    } else {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < this.particles.length; i++) {
        const d = Math.abs(this.particles[i].alpha - alpha);
        if (d < bestD) { bestD = d; best = i; }
      }
      this.focusIndex = best;
    }
    this._applyFocus();
  }

  _applyFocus() {
    if (this.focusIndex < 0) {
      this.particles.forEach(p => {
        p.setVisible(true);
        p.setHighlight(false);
      });
    } else {
      this.particles.forEach((p, i) => {
        const on = i === this.focusIndex;
        p.setVisible(on);
        p.setHighlight(on);
      });
    }
  }

  setTrailVisible(v) {
    this.particles.forEach(p => p.setTrailVisible(v));
  }

  /** 当前已击中粒子数量（满足 α > π/3） */
  hitCount() {
    return this.particles.reduce((s, p) => s + (p.hits ? 1 : 0), 0);
  }
}
