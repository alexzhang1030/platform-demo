# Nesting Layout

## 目标

editor 里的 2D 面板不再承担编辑职责，而是作为给激光切割器看的 nesting / output 视图。它展示的是一份从当前 document 派生出来的排版结果，不是 board 在编辑空间里的真实 transform。

## 关键文件

- `packages/core/src/nesting.ts`
- `packages/core/src/geometry.ts`
- `apps/web/src/components/pattern-studio/editor-page.tsx`

## 数据流

数据流分两段：

- `packages/core/src/nesting.ts`
  把当前 document 里的 board 转成可排版的 footprint，再做 deterministic packing。
- `apps/web/src/components/pattern-studio/editor-page.tsx`
  用 `buildNestingLayout(document)` 的结果渲染 sheet、board placement 和简单标注。

这意味着：

- 3D 里的 board `transform` 仍然是编辑态真相
- 2D nesting 只是一个 derived manufacturing layout
- 2D 排版不会反写 document

## Packing 策略

当前是矩形优先的 shelf packing：

- 先用 board outline 的 bounds 得到 footprint 宽高
- 默认允许 `0 / 90` 两种朝向
- 按最大边和面积排序，尽量先放大件
- 在一张 sheet 的现有 shelf 里找最合适的位置
- 放不下时新开一条 shelf；整张 sheet 放不下时新开一张 sheet

这个策略不是多边形最优排样，但足够稳定、可预测，而且是纯计算逻辑，适合放在 `packages/core` 复用。

## 为什么核心算法放在 core

packing 跟 React、SVG、Three 都没关系，本质上是纯函数：

- 更容易复用到 generator 或 export
- 更容易单独校验
- 不会把 `editor-page.tsx` 变成一堆排版算法

所以当前实现把 geometry 和 nesting 都放在 `packages/core`，UI 只负责消费结果。

## Sheet 尺寸为什么会收口

packing 容量内部仍然有默认 sheet 宽高，但返回给 UI 的 `sheet.width / sheet.height` 会按当前 placement 的实际占用范围裁剪一遍，再补一圈 padding。

这样做的结果是：

- 2D 视图不会总显示一整张很大的空板
- 小文档会看到更贴合内容的 sheet 尺寸
- packing 本身的稳定性不受影响

## 2D 里为什么只保留选择

2D nesting 现在只允许选择：

- 单击单选
- `Cmd/Ctrl + 点击` 切换多选

不支持：

- 2D 拖拽
- 点编辑
- 2D 创建 board

原因是 2D 已经被定义成 output 视图，真正的编辑面是 3D。保留选择只是为了让 2D 和 inspector / board list 之间还能联动。
