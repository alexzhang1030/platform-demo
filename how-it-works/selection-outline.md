# Selection Outline

## 目标

选中高亮需要满足两点：

- 在 WebGPU 路径下可用
- 比单纯改材质颜色更清楚

所以当前实现用的是 outline 后处理，而不是只给选中 mesh 改个描边材质。

## 关键文件

- `apps/web/src/components/pattern-studio/selection-outline.tsx`
- `apps/web/src/components/pattern-studio/board-preview-3d.tsx`

## 数据是怎么进来的

`board-preview-3d.tsx` 会维护一个 `selectedObjectsRef`：

- 每个 board mesh mount 时注册到 map
- 当前选中 board 的 Object3D 会被收集进数组

outline pass 不自己找对象，只直接读取这个 ref。

这样做的好处是很直接：

- 选中状态仍然由 editor 业务层控制
- outline 只关心“有哪些 Object3D 需要高亮”

## 渲染链路

`selection-outline.tsx` 里做了几件事：

1. 确认当前 renderer 是 WebGPU
2. 先创建 scene pass
3. 再创建 outline node
4. 最后把 scene color 和 outline color 合成到 `RenderPipeline`

然后在 `useFrame` 里手动调用 `renderPipeline.render()`。

## 为什么要单独初始化 renderer

WebGPU renderer 需要 `init()`。

outline 依赖 renderer 已就绪，所以这里先做一层类型判断和初始化等待，再创建 pipeline。否则后处理链路会在 renderer 还没准备好时就启动。

## 蓝色脉冲是怎么做的

outline 颜色分两层：

- 可见边：更亮的蓝
- 被遮挡边：更浅的蓝

之后再把颜色乘上一个随时间变化的 `oscSine`，形成脉冲。

所以这个效果不是 CSS 动画，而是 shader/node graph 里的时间调制。

## 为什么把 downSampleRatio 设成 1

outline 如果先降采样再放大，远处或者缩小后的物体边缘很容易出现锯齿。

当前把 `downSampleRatio` 设成 `1`，也就是全分辨率算 outline，换来更平滑的边缘。

成本会略高一点，但当前场景规模可接受。
