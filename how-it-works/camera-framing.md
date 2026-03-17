# Camera Framing

## 目标

3D 预览最初用的是一组固定相机参数：

- 固定位置
- 固定 target
- 固定 `near / far`

这会导致一个问题：只要 board 稍微偏离原点，或者相机稍微 orbit 一下，物体就可能被裁切掉。

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

## 第二步：用 bounds 推导相机 framing

相机不再看固定原点，而是看 `bounds.center`。

初始位置也不是魔法常量，而是：

- 从 `center` 出发
- 沿着一个固定斜上方向偏移
- 偏移距离按 `maxDimension` 计算

这样 board 在原点附近、偏到一边、或者尺寸变大时，相机都能跟着一起适配。

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

## 为什么保留 OrbitControls

这次修的是 framing / clipping，不是控制系统。

所以实现上故意保持收敛：

- 继续沿用 `PerspectiveCamera + OrbitControls`
- 只改 camera target、camera position、`near / far`

这样风险最小，也更容易确认问题是否真的被修掉。
