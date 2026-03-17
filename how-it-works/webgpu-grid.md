# WebGPU Grid

## 目标

因为 `drei/Grid` 在当前 WebGPU 路径上不稳定，所以网格改成了一个完全本地的实现。

## 关键文件

- `apps/web/src/components/pattern-studio/webgpu-grid.tsx`

## 实现方式

不是画很多条线，而是：

- 放一个大 `planeGeometry`
- 用 `three/tsl` 在材质里程序化生成网格线

也就是说，网格是“材质算出来的”，不是一堆独立几何体。

## 双层网格

当前有两层：

- `cell`
  细网格
- `section`
  粗网格

每层都通过相同思路生成：

1. 把本地坐标按网格尺寸归一化
2. 用 `fract` 算出当前点离最近网格线的距离
3. 用 `fwidth` 做抗锯齿宽度估计
4. 得到线的 alpha

粗网格会混入更强的颜色和更高的存在感。

## 为什么要做 fade

无限网格如果处处同等强，会非常吵。

所以当前网格会按离中心的距离做衰减：

- 越远 alpha 越低
- 越近越清楚

这样主体区域更聚焦。

## 鼠标高亮怎么做

grid 接收一个 `cursorPositionRef`：

- 3D 场景里会把鼠标射线打到地面平面
- 得到平面交点
- 把交点写进 ref

材质里再根据当前位置和 cursor 的距离，算一个 reveal / highlight。

所以你看到的不是“一个单独的 cursor mesh”，而是网格材质本身在鼠标附近被点亮了。

## 为什么这种方案适合 WebGPU

优点很明确：

- 一个 plane 就够
- 没有大量 line geometry
- 没有依赖 WebGL-only helper
- 视觉可控

对于当前这个编辑器场景，这是比通用网格组件更稳的方案。
