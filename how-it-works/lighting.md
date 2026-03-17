# Lighting

## 目标

pattern studio 的 3D 光照不是追求写实渲染，而是追求两件事：

- 板材体积感清楚
- 明暗主题切换时观感稳定

## 关键文件

- `apps/web/src/components/pattern-studio/pattern-studio-lights.tsx`

## 灯光组成

当前是 4 盏灯：

- 1 个 `ambientLight`
- 1 个主方向光 `key light`
- 1 个补光 `fill light`
- 1 个轮廓光 `rim light`

其中真正带阴影的是主光。

## 主光为什么最重要

主光负责定义体积和阴影方向：

- 开启 `castShadow`
- 用正交阴影相机覆盖主体工作区
- 阴影 map 为 `1024 x 1024`
- 同时调 `bias`、`normalBias`、`radius`

这个组合决定了板材厚度、边缘和落影是否能看清。

## 为什么要分 light / dark 两套 target

明暗主题不只是“背景变色”，灯光目标也完全不同。

当前做法是为两种主题分别定义：

- 颜色
- 强度
- 阴影强度

暗色下：

- ambient 更低
- key/rim 更冷
- 阴影更重

亮色下：

- ambient 和 fill 更高
- key 更暖
- 阴影更柔

## 为什么用 useFrame 插值

如果主题切换时直接替换颜色和强度，画面会跳。

所以现在在 `useFrame` 里对：

- intensity
- color
- shadow intensity

做逐帧 lerp。

这样主题切换会平滑过渡，不会突然“闪一下”。

## 这套实现的边界

当前灯光系统是“轻量、可控、够稳定”的方案：

- 没有 HDRI
- 没有 GI
- 没有后处理光照特效

优点是实现简单，和 WebGPU 路径兼容性也更稳。
