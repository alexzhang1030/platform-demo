# Camera Framing

## 目标

当前相机逻辑只做两件事：

- 在 3D 视图首次挂载时，给一个合理的初始 framing
- 在用户需要时，通过 `Reset camera` 回到这份初始 framing

它不再在 document 每次变化时强行重算相机。

## 关键文件

- `apps/web/src/components/pattern-studio/board-preview-3d.tsx`

## 第一步：先算 board workspace bounds

当前实现先遍历所有 board，拿每个 board 的 outline 点做旋转，再平移到世界坐标，得到整个工作区的包围范围：

- `minX / maxX`
- `minY / maxY`
- `maxZ`

其中：

- `X/Y` 来自轮廓点
- `Z` 来自板厚 `thickness`

最后得到两个关键量：

- `center`
  整个工作区中心
- `maxDimension`
  工作区最大尺寸，再加一层 padding

## 第二步：只生成一次初始 framing

当前实现仍然会从 `bounds` 推导：

- 初始 `position`
- 初始 `target`
- 初始 `near / far`

但这份 framing 只在 `BoardPreview3D` 初始化时计算一次，并存成稳定状态。

这样做的原因很直接：

- 如果把 framing 跟 `document` 绑定
- 拖动物体时 `document` 会持续变化
- 相机就会不断被重写

用户会感觉视角在自己缩放或跳动。

现在这条逻辑已经删掉了，所以移动 board 不会再带着相机一起“自动重新看全场景”。

## 第三步：动态 near / far

裁切问题本质上常常不是“相机位置不对”，而是 frustum 太死。

当前实现把：

- `near`
- `far`

都改成从 scene size 和 camera distance 推导出来，而不是写死。

原则是：

- `near` 不能太大，否则近处物体容易被切掉
- `far` 不能太小，否则稍微绕一圈远侧就消失
- 也不能无限大，否则深度精度会恶化

所以现在用的是“相对尺寸 + clamp”的折中方式。

## Reset Camera

底部的 `Reset camera` 会直接调用 `OrbitControls.reset()`。

因为 controls 的初始 target / camera state 就来自那份稳定的初始 framing，所以 reset 的结果和首次进入页面时是一致的。

这比“每次 document 变化时自动重框”更可控：

- 用户决定什么时候回到全局视角
- 普通编辑过程不会被相机反向打断
