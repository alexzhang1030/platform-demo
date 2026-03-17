# PiP Workspace

## 目标

editor 的 split 模式里，3D 是底层主视图，2D 是一个可浮动的 PiP。这个 PiP 不是任意窗口系统，而是刻意做成“简单但够用”的三挡模型。

## 关键文件

- `apps/web/src/components/pattern-studio/editor-page.tsx`

## 状态模型

PiP 只维护两类状态：

- `level`
  三挡之一：`compact`、`expanded`、`fullscreen`
- `offset`
  相对右下角的偏移量

也就是说，PiP 的定位模型是“右下角锚定 + 偏移”，不是 `top/left` 自由窗口。

## 为什么用右下角锚定

之前如果同时用 `top/left/right/bottom` 和自由位移，展开动画和拖拽边界都会变复杂，也容易算错。

现在这套模型更稳定：

- 默认就在右下角
- 往左拖就是 `x` 增大
- 往上拖就是 `y` 增大
- 重置位置时直接回到 `{ x: 0, y: 0 }`

## 三挡策略

PiP 不支持自由 resize，只支持三挡：

- `compact`
  小参考窗
- `expanded`
  更大的浮动工作窗
- `fullscreen`
  直接覆盖中间主体工作区

按钮行为是循环切换：

- `compact -> expanded -> fullscreen -> compact`

这样比自由 resize 更容易控制交互，也更容易保证布局稳定。

## 全屏时为什么停掉 3D

当 PiP 进入 `fullscreen` 时，后面的 `BoardPreview3D` 会直接不渲染。

原因很直接：

- 全屏 PiP 已经完全盖住主体区
- 后面的 3D 继续跑只是在浪费 GPU / CPU
- 直接条件渲染掉，比“降帧”更简单、更可靠

## 动画处理

PiP 的展开动画只过渡：

- `width`
- `height`
- `bottom`
- `right`

不同时过渡 `top/left`。这样动画会稳定从右下角长开，不会出现锚点漂移。
