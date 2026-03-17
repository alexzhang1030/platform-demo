# Workspace Layout

## 目标

pattern studio 的布局不是传统的“左侧大表单 + 右侧小预览”，而是反过来：把 2D / 3D / SVG 工作区作为主舞台，控制区退成浮层。

## 关键文件

- `apps/web/src/components/pattern-studio/chrome.tsx`
- `apps/web/src/components/pattern-studio/editor-page.tsx`
- `apps/web/src/components/pattern-studio/generator-page.tsx`

## 核心结构

`chrome.tsx` 提供了 4 个非常轻的布局原语：

- `AppShell`
  负责整页背景、顶部 route chrome、主题切换和 editor / generator 导航。
- `WorkspaceViewport`
  负责主工作区的容器边框、背景和阴影。
- `OverlayPanel`
  负责左右上角的浮层 panel。
- `FloatingTray`
  负责底部浮动工具条。

这几个原语不包业务逻辑，只统一“壳”的视觉和层级。

## Editor 的组织方式

`editor-page.tsx` 里，editor 现在已经收敛成单一场景：

- 3D 永远是底层主视图
- 2D 永远是右下角 PiP，可切三挡
- 不再提供 `2D / 3D / 2D+3D` 模式切换

其他功能都被压缩成浮层：

- 左上：board 列表和 add/remove/export
- 右上：inspector
- 底部：3D 视口里的 `Reset camera`

这里的角色分工现在是明确的：

- 3D 是主编辑面，负责 create / drag / inspect 的交互
- 2D 是派生输出面，负责展示板材在切割 sheet 上的排版结果

## 为什么这样做

这个布局的重点不是“信息密度更高”，而是“让内容本身最大化”：

- 编辑时，用户盯的是 3D 板材和空间关系，不是表单
- 生产预览时，用户盯的是 2D 排版结果，不是 2D 编辑控件
- 控制区做成浮层后，既保留功能，又不抢主视觉
- editor 和 generator 共用同一套壳，后续继续扩展时不会风格漂移

## 响应式策略

这里没有做复杂断点系统，而是用几个简单原则：

- overlay 用 `max-w` / `max-h` 限制尺寸
- 宽屏时左右分布
- 窄屏时允许堆叠
- 主工作区始终优先占满剩余空间

这样实现简单，也足够稳定。
