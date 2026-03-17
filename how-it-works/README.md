# How It Works

这组文档解释 `apps/web/src/components/pattern-studio` 当前几个关键 feature 的实现原理。

建议按下面顺序阅读：

- `workspace-layout.md`
  解释 editor / generator 的 workspace-first 布局骨架。
- `pip-workspace.md`
  解释 editor 里 2D PiP 的三挡模型、定位方式和全屏策略。
- `camera-framing.md`
  解释 3D 预览相机如何根据 board bounds 自动 framing，并避免裁切。
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
- `apps/web/src/components/pattern-studio/pattern-studio-lights.tsx`
- `apps/web/src/components/pattern-studio/webgpu-grid.tsx`
- `apps/web/src/components/pattern-studio/selection-outline.tsx`
