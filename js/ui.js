/**
 * UI 控制：滑块、按钮、面板显隐。
 * 通过 EventTarget 派发事件，由 main.js 订阅，避免与场景层耦合。
 */

import { PHYS } from "./config.js";

export class UIController extends EventTarget {
  constructor() {
    super();

    // 元素引用
    this.el = {
      btnPlay: document.getElementById("btn-play"),
      btnReset: document.getElementById("btn-reset"),
      btnFocus: document.getElementById("btn-focus"),
      sliderTime: document.getElementById("slider-time"),
      sliderSpeed: document.getElementById("slider-speed"),
      sliderCount: document.getElementById("slider-count"),
      sliderAlpha: document.getElementById("slider-alpha"),
      lblTime: document.getElementById("lbl-time"),
      lblSpeed: document.getElementById("lbl-speed"),
      lblCount: document.getElementById("lbl-count"),
      lblAlpha: document.getElementById("lbl-alpha"),
      btnViews: document.querySelectorAll(".btn-view"),
      chkTrail: document.getElementById("chk-trail"),
      chkFields: document.getElementById("chk-fields"),
      chkScreen: document.getElementById("chk-screen"),
      chkLocus: document.getElementById("chk-locus"),
      btnInfoToggle: document.getElementById("btn-toggle-info"),
      btnMathToggle: document.getElementById("btn-toggle-math"),
      btnHelpToggle: document.getElementById("btn-toggle-help"),
      panelInfo: document.getElementById("info-panel"),
      panelMath: document.getElementById("math-panel"),
      panelHelp: document.getElementById("help-panel"),
      btnsClose: document.querySelectorAll(".btn-close"),
      hudTime: document.getElementById("hud-time"),
      hudAngle: document.getElementById("hud-angle"),
      hudLength: document.getElementById("hud-length"),
      loading: document.getElementById("loading"),
    };

    this.playing = false;
    this.focusOn = false;

    this._bind();
    this._initState();
  }

  _bind() {
    // 播放 / 暂停
    this.el.btnPlay.addEventListener("click", () => this.togglePlay());
    this.el.btnReset.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("reset"));
    });

    // 时间滑块
    this.el.sliderTime.addEventListener("input", (e) => {
      const v = +e.target.value / 1000;
      this.el.lblTime.textContent = (v * 100).toFixed(0) + "%";
      this.dispatchEvent(new CustomEvent("scrub", { detail: v }));
      // 拖动时暂停
      if (this.playing) this.togglePlay();
    });

    // 速度
    this.el.sliderSpeed.addEventListener("input", (e) => {
      const v = +e.target.value / 100;
      this.el.lblSpeed.textContent = v.toFixed(1) + "×";
      this.dispatchEvent(new CustomEvent("speed", { detail: v }));
    });

    // 粒子数
    this.el.sliderCount.addEventListener("input", (e) => {
      const v = +e.target.value;
      this.el.lblCount.textContent = String(v);
      this.dispatchEvent(new CustomEvent("count", { detail: v }));
    });

    // α
    this.el.sliderAlpha.addEventListener("input", (e) => {
      const deg = +e.target.value;
      const rad = (deg * Math.PI) / 180;
      this.el.lblAlpha.textContent = deg + "°";
      if (this.focusOn) {
        this.dispatchEvent(new CustomEvent("alpha", { detail: rad }));
      }
    });

    // 单粒子聚焦
    this.el.btnFocus.addEventListener("click", () => {
      this.focusOn = !this.focusOn;
      this.el.btnFocus.classList.toggle("active", this.focusOn);
      const deg = +this.el.sliderAlpha.value;
      const rad = (deg * Math.PI) / 180;
      this.el.lblAlpha.textContent = this.focusOn ? deg + "°" : "—";
      this.dispatchEvent(new CustomEvent("focus", {
        detail: this.focusOn ? rad : null,
      }));
    });

    // 视图按钮
    this.el.btnViews.forEach((b) => {
      b.addEventListener("click", () => {
        this.el.btnViews.forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        this.dispatchEvent(new CustomEvent("view", { detail: b.dataset.view }));
      });
    });

    // 显示开关
    this.el.chkTrail.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("trail", { detail: e.target.checked }));
    });
    this.el.chkFields.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("fields", { detail: e.target.checked }));
    });
    this.el.chkScreen.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("screen", { detail: e.target.checked }));
    });
    this.el.chkLocus.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("locus", { detail: e.target.checked }));
    });

    // 面板显隐
    this.el.btnInfoToggle.addEventListener("click", () => {
      this.el.panelInfo.classList.toggle("hidden");
    });
    this.el.btnMathToggle.addEventListener("click", () => {
      this.el.panelMath.classList.toggle("hidden");
    });
    this.el.btnHelpToggle.addEventListener("click", () => {
      this.el.panelHelp.classList.toggle("show");
    });
    this.el.btnsClose.forEach((b) => {
      b.addEventListener("click", () => {
        const target = b.dataset.target;
        const panel = document.getElementById(target);
        if (target === "help-panel") panel.classList.remove("show");
        else panel.classList.add("hidden");
      });
    });

    // 键盘快捷键
    window.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          this.togglePlay();
          break;
        case "r":
        case "R":
          this.dispatchEvent(new CustomEvent("reset"));
          break;
        case "1": this._clickView("iso"); break;
        case "2": this._clickView("top"); break;
        case "3": this._clickView("front"); break;
        case "4": this._clickView("side"); break;
        case "h":
        case "H":
          this.el.panelHelp.classList.toggle("show");
          break;
        case "Escape":
          this.el.panelHelp.classList.remove("show");
          break;
      }
    });
  }

  _clickView(name) {
    this.el.btnViews.forEach((b) => {
      if (b.dataset.view === name) b.click();
    });
  }

  _initState() {
    // 初始化默认状态
    this.el.lblSpeed.textContent = (+this.el.sliderSpeed.value / 100).toFixed(1) + "×";
    this.el.lblCount.textContent = this.el.sliderCount.value;
    this.el.lblTime.textContent = "0%";
    this.el.lblAlpha.textContent = "—";
    // 默认立体视角
    this.el.btnViews.forEach((b) => {
      if (b.dataset.view === "iso") b.classList.add("active");
    });
  }

  togglePlay() {
    this.playing = !this.playing;
    this.el.btnPlay.textContent = this.playing ? "⏸" : "▶";
    this.dispatchEvent(new CustomEvent("play", { detail: this.playing }));
  }

  setTau(tau) {
    this.el.sliderTime.value = String(Math.round(tau * 1000));
    this.el.lblTime.textContent = (tau * 100).toFixed(0) + "%";
    this.el.hudTime.textContent = tau.toFixed(3);
    const deg = (tau * 120);
    this.el.hudAngle.textContent = deg.toFixed(1) + "°";

    // 亮线长度（视觉上同步）
    let L = 0;
    if (tau >= 0.985) L = Math.min(1, (tau - 0.985) / 0.015) * (Math.sqrt(3) / 4);
    this.el.hudLength.textContent = L.toFixed(3);
  }

  hideLoading() {
    this.el.loading.classList.add("hidden");
  }

  // 在 main.js 重置时由其调用
  resetUI() {
    if (this.playing) this.togglePlay();
    this.el.sliderTime.value = "0";
    this.el.lblTime.textContent = "0%";
  }
}

/**
 * 渲染推导面板（KaTeX）。
 * KaTeX auto-render 通过 <script defer> 加载，等就绪后调用一次。
 */
export function renderMath() {
  const tryRender = () => {
    if (!window.renderMathInElement) {
      setTimeout(tryRender, 60);
      return;
    }
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
      output: "html",
    });
  };
  tryRender();
}
