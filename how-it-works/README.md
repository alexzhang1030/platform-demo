# How It Works

这组文档解释 `apps/web/src/components/pattern-studio` 当前几个关键 feature 的实现原理。

建议按下面顺序阅读：

- `workspace-layout.md`
  解释 editor / generator 的 workspace-first 布局骨架，以及 editor 里 3D 主编辑面 + 2D 输出面的角色分工。
- `nesting-layout.md`
  解释 2D 面板如何通过 `packages/core` 的 packing 结果生成给激光切割器看的 nesting 视图。
- `pip-workspace.md`
  解释 editor 里 2D PiP 的三挡模型、右下角锚定方式和 `+ / -` 控制策略。
- `camera-framing.md`
  解释 3D 预览相机如何只做初始 framing、为什么不再跟着 document 自动重算，以及 `Reset camera` 怎么工作。
- `create-board.md`
  解释 3D create-board 如何生成立板、如何做吸附，以及吸附后为什么会把燕尾榫直接写进 board 几何。
- `boxel-mode.md`
  解释 `boxel-mode` 如何把体素堆叠持久化成 `BoxelAssembly`，以及 editor 如何预览、选择和提交这些 stack。
- `algorithms.md`
  集中整理 boxel、gable roof 和 finger joint 的核心算法，尤其说明 finger joint 如何从 connection 派生成局部轮廓。
- `lighting.md`
  解释 3D 预览的三盏方向光和环境光如何工作。
- `webgpu-grid.md`
  解释 WebGPU 下的程序化网格实现。
- `selection-outline.md`
  解释 WebGPU 兼容的选中高亮后处理。

这些文档对应的主要代码文件：

- `apps/web/src/components/pattern-studio/chrome.tsx`
- `apps/web/src/components/pattern-studio/editor-page.tsx`
- `apps/web/src/components/pattern-studio/board-preview-3d.tsx`
- `apps/web/src/lib/pattern-studio.ts`
- `packages/core/src/nesting.ts`
- `packages/core/src/geometry.ts`
- `packages/core/src/upright-board.ts`
- `packages/core/src/board-finger-joint.ts`
- `packages/core/src/boxel.ts`
- `apps/web/src/components/pattern-studio/pattern-studio-lights.tsx`
- `apps/web/src/components/pattern-studio/webgpu-grid.tsx`
- `apps/web/src/components/pattern-studio/selection-outline.tsx`
