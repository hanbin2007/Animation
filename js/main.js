/**
 * 入口：装配场景、粒子系统、UI；驱动主循环。
 */

import { SceneManager } from "./scene.js";
import { ParticleSystem } from "./particles.js";
import { UIController, renderMath } from "./ui.js";
import { ANIM, PHYS } from "./config.js";

(async function bootstrap() {
  const container = document.getElementById("canvas-container");

  // 1) 场景
  const scene = new SceneManager(container);

  // 2) 粒子
  const particles = new ParticleSystem(scene.scene);
  particles.setCount(ANIM.defaultCount);

  // 3) UI
  const ui = new UIController();

  // 状态
  let tau = 0;
  let speed = ANIM.defaultSpeed;
  let lastT = performance.now();
  let holdAt1Until = 0;     // 当 τ 抵达 1 时停留到这个时间戳后才循环

  // -----------------------
  // UI 事件 → 改场景状态
  // -----------------------
  ui.addEventListener("play", (e) => { /* 由主循环读取 ui.playing */ });
  ui.addEventListener("reset", () => {
    tau = 0;
    holdAt1Until = 0;
    particles.update(tau);
    ui.resetUI();
    ui.setTau(tau);
  });
  ui.addEventListener("scrub", (e) => {
    tau = e.detail;
    holdAt1Until = 0;
    particles.update(tau);
    ui.setTau(tau);
  });
  ui.addEventListener("speed", (e) => { speed = e.detail; });
  ui.addEventListener("count", (e) => {
    particles.setCount(e.detail);
    particles.update(tau);
  });
  ui.addEventListener("focus", (e) => { particles.setFocus(e.detail); });
  ui.addEventListener("alpha", (e) => {
    particles.setFocus(e.detail);
  });
  ui.addEventListener("view", (e) => { scene.setView(e.detail); });
  ui.addEventListener("trail", (e) => { particles.setTrailVisible(e.detail); });
  ui.addEventListener("fields", (e) => { scene.setFieldsVisible(e.detail); });
  ui.addEventListener("screen", (e) => { scene.setScreenVisible(e.detail); });
  ui.addEventListener("locus", (e) => { scene.setLocusVisible(e.detail); });

  // -----------------------
  // 主循环
  // -----------------------
  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    if (ui.playing) {
      if (holdAt1Until) {
        // τ 抵达 1 时的"留屏"阶段
        if (now >= holdAt1Until) {
          holdAt1Until = 0;
          tau = 0;
        } else {
          tau = 1;
        }
      } else {
        // τ 周期：默认 1× 时 0 → 1 用约 2s
        tau += dt * speed * 0.5;
        if (tau >= 1) {
          tau = 1;
          holdAt1Until = now + 900;     // 在屏上停 0.9s
        }
      }
      particles.update(tau);
      ui.setTau(tau);
    }

    scene.render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame((t) => { lastT = t; tick(t); });

  // 渲染数学公式
  renderMath();

  // 隐藏加载层
  setTimeout(() => ui.hideLoading(), 200);
})();
