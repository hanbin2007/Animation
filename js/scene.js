/**
 * 3D 场景管理：相机、渲染器、坐标轴、场矢量、荧光屏、落点圆等。
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { PHYS, VISUAL } from "./config.js";

const U = VISUAL.unit;        // 一个 d 在场景中的真实长度
const C = VISUAL.colors;

export class SceneManager {
  constructor(container) {
    this.container = container;

    // ----- Renderer -----
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // ----- Label renderer -----
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(this.labelRenderer.domElement.style, {
      position: "fixed",
      top: "0",
      left: "0",
      pointerEvents: "none",
      zIndex: "1",
    });
    container.appendChild(this.labelRenderer.domElement);

    // ----- Scene -----
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05060d, 0.012);

    // ----- Camera -----
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    this.camera.position.set(7, 6, 9);
    this.camera.lookAt(0, U * 0.5, 0);

    // ----- Controls -----
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, U * 0.5, 0);

    // ----- Lights -----
    this.scene.add(new THREE.AmbientLight(0x88aaff, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.6);
    key.position.set(6, 10, 6);
    this.scene.add(key);
    const rim = new THREE.PointLight(0xb794ff, 1.2, 60);
    rim.position.set(-8, 4, -8);
    this.scene.add(rim);

    // ----- Post processing -----
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85,   // strength
      0.5,    // radius
      0.18    // threshold
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // ----- 场景内容 -----
    this.groups = {};
    this._buildBackground();
    this._buildGrid();
    this._buildAxes();
    this._buildFields();
    this._buildSource();
    this._buildScreen();
    this._buildLocusCircle();

    // ----- 事件 -----
    window.addEventListener("resize", () => this._onResize());
  }

  // -------------------------------------------------
  // 背景：星空粒子
  // -------------------------------------------------
  _buildBackground() {
    const N = 1200;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 60 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const t = Math.random();
      colors[i * 3] = 0.6 + 0.4 * t;
      colors[i * 3 + 1] = 0.7 + 0.3 * t;
      colors[i * 3 + 2] = 1.0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const m = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.stars = new THREE.Points(g, m);
    this.scene.add(this.stars);
  }

  // -------------------------------------------------
  // 网格地面（xOy 平面）
  // -------------------------------------------------
  _buildGrid() {
    const grid = new THREE.GridHelper(20, 20, 0x223358, 0x1a2440);
    grid.rotation.x = Math.PI / 2;     // 让 grid 落在 xy 平面
    grid.position.z = 0;
    grid.material.opacity = 0.45;
    grid.material.transparent = true;
    this.scene.add(grid);
    this.groups.grid = grid;
  }

  // -------------------------------------------------
  // 坐标轴 + 标签
  // -------------------------------------------------
  _buildAxes() {
    const group = new THREE.Group();
    const axisLen = 6;

    const buildAxis = (dir, color, label) => {
      const dirN = dir.clone().normalize();
      const arrow = new THREE.ArrowHelper(
        dirN,
        new THREE.Vector3(0, 0, 0),
        axisLen,
        color,
        0.4,
        0.18
      );
      arrow.line.material.linewidth = 2;
      group.add(arrow);

      // 标签
      const div = document.createElement("div");
      div.textContent = label;
      Object.assign(div.style, {
        color: "#" + color.toString(16).padStart(6, "0"),
        font: "600 14px var(--font-mono)",
        textShadow: "0 0 6px #000",
        padding: "0 4px",
      });
      const cssObj = new CSS2DObject(div);
      cssObj.position.copy(dirN.clone().multiplyScalar(axisLen + 0.3));
      group.add(cssObj);
    };

    buildAxis(new THREE.Vector3(1, 0, 0), C.axisX, "x");
    buildAxis(new THREE.Vector3(0, 0, -1), C.axisY, "y"); // 视觉 y 朝深处
    buildAxis(new THREE.Vector3(0, 1, 0), C.axisZ, "z");

    // 原点标记
    const oDiv = document.createElement("div");
    oDiv.textContent = "O";
    Object.assign(oDiv.style, {
      color: "#fff",
      font: "600 13px var(--font-mono)",
      textShadow: "0 0 6px #000",
      padding: "0 4px",
      transform: "translate(-12px, 4px)",
    });
    const oLab = new CSS2DObject(oDiv);
    oLab.position.set(0, 0, 0);
    group.add(oLab);

    this.scene.add(group);
    this.groups.axes = group;
  }

  // -------------------------------------------------
  // 电场 / 磁场矢量箭头
  // -------------------------------------------------
  _buildFields() {
    const group = new THREE.Group();

    // 电场（暖色，密集）
    const eGroup = new THREE.Group();
    const eMat = new THREE.MeshBasicMaterial({ color: C.eField, transparent: true, opacity: 0.9 });
    const eGeo = new THREE.ConeGeometry(0.12, 0.45, 8);

    const positions = [];
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        if (i === 0 && j === 0) continue;
        positions.push([i * 1.6, j * 1.6]);
      }
    }
    positions.forEach(([x, y]) => {
      // 电场柱：一段细线 + 顶端箭头
      const line = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 5.5, 6),
        new THREE.MeshBasicMaterial({ color: C.eField, transparent: true, opacity: 0.45 })
      );
      line.position.set(x, 2.75, y);
      eGroup.add(line);

      const cone = new THREE.Mesh(eGeo, eMat);
      cone.position.set(x, 5.4, y);
      eGroup.add(cone);
    });
    // 标签 E
    const eLab = makeLabel("E", "#ff8c5a");
    eLab.position.set(3.4, 5.5, 3.4);
    eGroup.add(eLab);
    group.add(eGroup);

    // 磁场（冷色，稀疏一些，与电场错开 + 用双箭头表示）
    const bGroup = new THREE.Group();
    const bMat = new THREE.MeshBasicMaterial({ color: C.bField, transparent: true, opacity: 0.9 });
    const bGeo = new THREE.ConeGeometry(0.13, 0.5, 8);
    const bPos = [];
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        if ((i + j) % 2 !== 0) continue;
        if (i === 0 && j === 0) continue;
        bPos.push([i * 1.6 + 0.3, j * 1.6 + 0.3]);
      }
    }
    bPos.forEach(([x, y]) => {
      const cone = new THREE.Mesh(bGeo, bMat);
      cone.position.set(x, 1.1, y);
      bGroup.add(cone);
      const cone2 = cone.clone();
      cone2.position.y = 1.7;
      bGroup.add(cone2);
    });
    const bLab = makeLabel("B", "#6ad1ff");
    bLab.position.set(-3.4, 1.6, 3.4);
    bGroup.add(bLab);
    group.add(bGroup);

    this.scene.add(group);
    this.groups.fields = group;
  }

  // -------------------------------------------------
  // 粒子源（原点处的发光球）
  // -------------------------------------------------
  _buildSource() {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 24, 24),
      new THREE.MeshBasicMaterial({ color: C.source })
    );
    this.scene.add(sphere);

    // 光晕
    const glowGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: C.source,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(glow);

    this.groups.source = sphere;
    this.groups.sourceGlow = glow;

    // 第一象限发射方向扇形
    const fanShape = new THREE.Shape();
    const R = 1.0;
    fanShape.moveTo(0, 0);
    fanShape.lineTo(R, 0);
    fanShape.absarc(0, 0, R, 0, Math.PI / 2, false);
    fanShape.lineTo(0, 0);
    const fanGeo = new THREE.ShapeGeometry(fanShape);
    const fanMat = new THREE.MeshBasicMaterial({
      color: C.source,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fan = new THREE.Mesh(fanGeo, fanMat);
    // 形状原本在 xy 平面（z=0）。绕 x 轴旋转 -π/2 后，
    // 原 shape 的 +y 变为 scene 的 -z（即物理 +y），原 +x 仍是 scene +x。
    fan.rotation.x = -Math.PI / 2;
    this.scene.add(fan);
    this.groups.fan = fan;
  }

  // -------------------------------------------------
  // 荧光屏
  // -------------------------------------------------
  _buildScreen() {
    const group = new THREE.Group();

    const w = VISUAL.screenWidth;
    const h = VISUAL.screenDepth;

    // 屏面：z = d（场景中 y = U），y > 0（场景中 -Z 方向）
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: C.screen,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, U, -h / 2);   // 屏的 y > 0 区
    group.add(plane);

    // 边框
    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: C.screenEdge,
      transparent: true,
      opacity: 0.7,
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.rotation.x = -Math.PI / 2;
    edges.position.set(0, U, -h / 2);
    group.add(edges);

    // 屏内淡网格
    const gridHelper = new THREE.GridHelper(w, 8, 0x6a4ec0, 0x3b2a78);
    gridHelper.material.opacity = 0.18;
    gridHelper.material.transparent = true;
    gridHelper.position.set(0, U + 0.001, -h / 2);
    group.add(gridHelper);

    // 标签 "z = d"
    const lab = makeLabel("z = d  (荧光屏)", "#c8b6ff");
    lab.position.set(-w / 2 - 0.4, U + 0.1, -h / 2);
    group.add(lab);

    this.scene.add(group);
    this.groups.screen = group;
  }

  // -------------------------------------------------
  // 屏上落点理论圆（半径 √3 r）
  // -------------------------------------------------
  _buildLocusCircle() {
    // 屏上落点圆：物理 (R cos a, R sin a, d) → 场景 (R·U cos a, U, -R·U sin a)
    const R = PHYS.locusRadius * U;
    const segs = 192;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * 2 * Math.PI;
      pts.push(new THREE.Vector3(R * Math.cos(a), U + 0.005, -R * Math.sin(a)));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: C.locus,
      dashSize: 0.12,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.55,
    });
    const circle = new THREE.Line(geo, mat);
    circle.computeLineDistances();
    this.scene.add(circle);
    this.groups.locus = circle;

    // xOy 平面（场景 y=0）上的圆周运动参考圆，半径 r。
    // 默认隐藏，方便单粒子聚焦时核对"半径 r"的几何意义。
    const r = PHYS.r * U;
    const ptsG = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * 2 * Math.PI;
      ptsG.push(new THREE.Vector3(r * Math.cos(a), 0.001, -r * Math.sin(a)));
    }
    const groundCircleGeo = new THREE.BufferGeometry().setFromPoints(ptsG);
    const groundCircle = new THREE.Line(
      groundCircleGeo,
      new THREE.LineDashedMaterial({
        color: 0x3b6ea0,
        dashSize: 0.08,
        gapSize: 0.06,
        transparent: true,
        opacity: 0.0,
      })
    );
    groundCircle.computeLineDistances();
    this.scene.add(groundCircle);
    this.groups.groundCircle = groundCircle;
  }

  // -------------------------------------------------
  // 视图预设
  // -------------------------------------------------
  setView(name) {
    const t = this.controls.target;
    let pos;
    switch (name) {
      case "top":
        pos = new THREE.Vector3(0.001, 18, 0.001);
        this.controls.target.set(0, U, 0);
        break;
      case "front":
        pos = new THREE.Vector3(0, U * 0.5, 14);
        this.controls.target.set(0, U * 0.5, 0);
        break;
      case "side":
        pos = new THREE.Vector3(14, U * 0.5, 0);
        this.controls.target.set(0, U * 0.5, 0);
        break;
      case "iso":
      default:
        pos = new THREE.Vector3(7, 6, 9);
        this.controls.target.set(0, U * 0.5, 0);
        break;
    }
    // 平滑过渡
    this._tweenCamera(pos);
  }

  _tweenCamera(target) {
    const start = this.camera.position.clone();
    const end = target.clone();
    const t0 = performance.now();
    const dur = 600;
    const tween = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const ease = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(start, end, ease);
      if (k < 1) requestAnimationFrame(tween);
    };
    tween();
  }

  // -------------------------------------------------
  // 显隐切换
  // -------------------------------------------------
  setFieldsVisible(v)  { this.groups.fields.visible = v; }
  setScreenVisible(v)  { this.groups.screen.visible = v; }
  setLocusVisible(v)   {
    this.groups.locus.visible = v;
    this.groups.groundCircle.material.opacity = v ? 0.45 : 0.0;
  }

  // -------------------------------------------------
  // 渲染 & 缩放
  // -------------------------------------------------
  render() {
    this.controls.update();
    // 让粒子源呼吸
    if (this.groups.sourceGlow) {
      const t = performance.now() * 0.002;
      const s = 1 + 0.18 * Math.sin(t);
      this.groups.sourceGlow.scale.setScalar(s);
    }
    if (this.stars) this.stars.rotation.y += 0.0003;
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
    this.labelRenderer.setSize(w, h);
  }
}

// -------------------------------------------------
// helper: HTML 标签
// -------------------------------------------------
function makeLabel(text, color) {
  const div = document.createElement("div");
  div.textContent = text;
  Object.assign(div.style, {
    color,
    font: "600 13px var(--font-mono), monospace",
    textShadow: "0 0 6px #000, 0 0 2px #000",
    padding: "0 4px",
    pointerEvents: "none",
  });
  return new CSS2DObject(div);
}

/**
 * 把"物理坐标 (x, y, z) 以 d 为单位"转换为 three.js 场景中的位置 Vector3：
 *   physical x  → scene x
 *   physical y  → scene -z   （让 +y 看起来朝向用户/深处）
 *   physical z  → scene y    （+z 朝上）
 * 同时按 unit 缩放。
 */
export function toScene(x, y, z, vec) {
  const v = vec || new THREE.Vector3();
  v.set(x * U, z * U, -y * U);
  return v;
}
