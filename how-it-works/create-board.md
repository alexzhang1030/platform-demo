# Create Board

## 目标

当前的 create-board 是一个 3D 优先工具：

- 在地面平面上点一次定起点
- 移动鼠标预览立起来的板
- 再点一次提交

提交出来的不是平铺板，而是 `orientation = upright` 的立板。

## 关键文件

- `apps/web/src/components/pattern-studio/board-preview-3d.tsx`
- `apps/web/src/lib/pattern-studio.ts`
- `packages/core/src/upright-board.ts`
- `packages/protocol/src/index.ts`

## 数据模型

`BoardTransform` 现在多了一个可选的 `orientation`：

- `flat`
- `upright`

`flat` 继续表示原来的平铺板。  
`upright` 表示板的切割轮廓仍然是 2D outline，但 3D 渲染时会把这块板立起来。

这样 2D nesting 仍然只关心切割轮廓，3D 则可以把同一份数据渲染成立板。

## 为什么把核心逻辑放进 core

create-board 里真正需要共享的部分不是 React 状态，而是这些纯算法：

- span 归一化
- 立板轮廓生成
- 已有立板的吸附检测
- 燕尾榫 tab / socket 轮廓生成

这些都放在 `packages/core/src/upright-board.ts`，这样 editor 和 generator 后续如果都需要读这套切割几何，就不会再从组件里抄逻辑。

## 创建流程

组件层先把鼠标命中的地面点转成 document 坐标，再做三步：

1. 网格吸附
2. 默认 45 度方向吸附
3. 如果靠近已有立板，则吸附到已有立板的基线

这里“已有立板的基线”指的是那块立板在地面上的长度轴线，而不是整块 3D mesh 的包围盒。

## 立板是怎么生成的

create gesture 最终只创建一块板：

- 本地 `x` 方向是板的长度
- 本地 `y` 方向是板的高度
- `thickness` 是挤出厚度

在 2D 数据里，这仍然是一块普通的切割轮廓矩形。  
在 3D 渲染里，这块 outline 会被绕 `X` 轴旋转 90 度，所以板会立起来。

## 吸附后的燕尾榫

如果起点或终点吸附到已有立板：

- 新建板会在对应端生成一个燕尾榫 tab
- 被吸附的已有板会新增一个燕尾榫 socket hole

也就是说，连接关系不是只体现在运行时，而是直接写进两块板的切割几何：

- 新板：outline 变化
- 已有板：holes 增加

这样 2D nesting 和 3D 预览看到的是同一套结果。

## 3D 预览如何处理 upright

`BoardPreview3D` 对 `flat` 和 `upright` 走的是两条 shape 转换路径：

- `flat`：沿用原来的平面轮廓坐标转换
- `upright`：保留本地高度坐标，不再把 outline 的 `y` 当作地面 `y`

然后 upright geometry 会：

- 先把挤出厚度居中
- 再在 mesh 层绕 `X` 轴旋转 90 度
- 最后由外层 group 用 `rotation` 决定它在地面上的朝向

这样长度沿地面，厚度横向展开，高度朝 `Z` 方向抬起。

## Hinged / roof board 的轮廓约束

屋顶板使用 `orientation = hinged`，它和 `upright` 一样都把 outline 的本地 `y` 视为板高，只是在 3D 里额外按 `pitch` 绕铰接边倾斜。

这有一个重要约束：

- `left/right` anchor 连接可以参与 finger joint 轮廓改写
- `top/bottom` anchor 连接不应该改写板的 outline

原因是 `top/bottom` 对 `upright` / `hinged` 板来说表示沿板高方向的连接点。像 `roof.bottom -> wall.top` 这样的连接如果直接改写 outline，会把墙顶或屋顶底边也算进 joint 轮廓，进而污染板高、anchor 高度和 3D 外观。

所以当前实现里，roof-to-wall 这类 `bottom -> top` 连接只保留连接语义与 anchor 对齐，不参与 finger-joint 轮廓生成。这样生成屋顶时不会把墙体高度一起改掉，屋顶板高也仍然由原始 roof panel outline 决定。

但 `hinged roof.top -> hinged roof.top` 的屋脊连接是例外：它仍然会参与 finger-joint 轮廓生成。实现上只有 `hinged` 板的 `top/bottom` 会提供接缝方向，而普通 `upright` 板的 `top/bottom` 仍然视为 unsupported。这样可以保住屋脊的 interlocking seam，同时避免墙顶被误改。

另外，gable roof 的 roof panel 高度不是根据两面墙 `transform` 起点的直线距离计算，而是根据两条平行墙基线之间的垂直距离计算。这样即使两面墙的起点不在同一端、或者其中一面墙反向放置，roof panel 的斜板高度仍然只反映真实跨距，不会被墙长方向的偏移放大。
