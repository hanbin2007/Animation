# 带电粒子在匀强电磁场中的运动 — 第 (3) 问 3D 交互演示

> 高考物理压轴题：粒子源在原点向 *xOy* 平面第一象限发射粒子，求 *z = +d*、*y > 0* 的荧光屏上亮线长度 *L*。

**在线演示**：开启 GitHub Pages 后访问
`https://hanbin2007.github.io/animation/`

---

## 关键结论

$$
L = \dfrac{\sqrt{3}}{4}\,d \approx 0.433\,d
$$

## 物理与几何要点

| 量 | 表达式 | 数值（归一化） |
| :-- | :-- | :-- |
| 加速度 *a* | *qE/m* = 2*v*₀² / *d* | 2 |
| 圆周半径 *r* | *mv*₀ / (*qB*) = 3*d* / (2π) | ≈ 0.477 |
| 圆周周期 *T* | 2π*m* / (*qB*) = 3*d* / *v*₀ | 3 |
| 飞行时间 *t* | *d / v*₀ | 1 |
| 转过角 ω*t* | 2π/3 = 120° | — |
| 落点轨迹 | 在 *z = d* 平面、半径 √3 *r* 的圆上 | — |
| 屏内有效角 | π/6 = 30° | — |
| 亮线长度 *L* | √3 *r* · π/6 | √3/4 |

## 项目结构

```
.
├── index.html          # 入口（含 KaTeX 引用）
├── styles/
│   └── main.css        # 暗色玻璃质感 UI
├── js/
│   ├── config.js       # 物理常量与可视化参数
│   ├── physics.js      # 运动方程 / 解析公式
│   ├── scene.js        # Three.js 场景、轴、场矢量、荧光屏、相机
│   ├── particles.js    # 粒子系统、轨迹折线、亮线弧
│   ├── ui.js           # 控件与 KaTeX 渲染
│   └── main.js         # 装配 + 主循环
└── .nojekyll           # 让 GitHub Pages 直接发布原始文件
```

## 交互说明

| 操作 | 效果 |
| :-- | :-- |
| 左键拖拽 | 旋转视角 |
| 右键拖拽 | 平移视角 |
| 滚轮 | 缩放 |
| Space | 播放 / 暂停 |
| R | 重置 |
| 1 / 2 / 3 / 4 | 立体 / 俯视 / 正视 / 侧视 |
| H | 操作说明 |

## 本地预览

任意静态文件服务器即可（必须用 HTTP，不能用 file://，因为使用了 ES Modules）：

```bash
# Python 3
python -m http.server 8080
# 然后访问 http://localhost:8080/
```

## 部署到 GitHub Pages

1. 将本仓库当前分支 push 到 GitHub。
2. 仓库 Settings → Pages：
   - Source 选 **Deploy from a branch**
   - Branch 选 `claude/3d-interactive-demo-cNSQb`（或合并到 `main` 后选 `main`），目录 `/ (root)`。
3. 等待数十秒，访问上方链接即可。
