# Algorithms

## 目标

这篇文档集中整理 pattern studio 当前几套关键算法，重点解释 `finger joint` 是怎么从连接关系推导成板轮廓的。

## 关键文件

- `packages/core/src/board-finger-joint.ts`
- `packages/core/src/boxel.ts`
- `apps/web/src/lib/pattern-studio.ts`
- `apps/web/src/components/pattern-studio/board-preview-3d.tsx`

## Finger joint 算法

### 1. 输入不是“几何相交”，而是 board connection

当前 finger joint 不直接从 mesh 碰撞推导，而是读取 `BoardGroup.connections`。算法入口是：

- `getBoardOutlineWithJoints(board, groups, allBoards)`

它会：

1. 找出所有包含当前 board 的 group
2. 收集所有涉及当前 board 的 connection
3. 逐条 connection 计算当前 board 的哪条边需要改写
4. 返回一个新的 outline，原始 `board.outline` 不会被修改

这意味着 finger joint 是一种 **派生轮廓**，不是持久化回 document 的几何变更。

### 2. 先把 connection 分类成可支持的方向关系

`classifyConnectionAngle()` 先把每块板在某个 anchor 处的“向外方向”算出来，再用二维向量叉积判断是：

- `L-joint`
- `straight`
- `unsupported`

关键点：

- `left/right` 使用基线方向本身
- `hinged` 板的 `top/bottom` 使用基线法线，再乘上 `flipPitch`
- 普通 `upright` 板的 `top/bottom` 直接视为 `unsupported`

这里的约束很重要：

- 墙体的 `top/bottom` 不参与 finger joint，避免把墙高改掉
- 只有屋顶这类 `hinged` 板的 `top/top` 屋脊连接，才允许进入 finger joint 流程

### 3. 齿数算法

`computeFingerPattern(height, thickness)` 的规则很简单：

- 初值：`round(height / (2 * thickness))`
- 下限：`3`
- 上限：`15`
- 强制奇数
- `fingerWidth = height / fingerCount`

为什么强制奇数：

- 这样一条 edge 从一端开始和结束时，tab / socket 的节奏更稳定
- 两块板做交错时，更容易得到对称的接缝

### 4. 把 edge 改写成锯齿轮廓

真正生成点列的是 `buildFingerEdgePoints()`。

它不是做布尔运算，而是直接按 edge 走向重建折线：

- 垂直边：tab 深度沿 `X` 推出/缩回
- 水平边：tab 深度沿 `Y` 推出/缩回
- `subtractive = true` 时，把原本向外的 tab 反向拉到板内，形成 socket 风格

然后 `buildOutlineWithFingerJoints()` 按四条边顺序把这些点重新拼成新的闭合 outline。

### 5. 为什么以前会“长很多”

旧问题的根因不是 3D 旋转，而是算法把 finger joint 施加到了 **整条 top edge**：

- 屋脊 `top-top` 一接上，就把整条 roof top edge 变成锯齿
- `depth` 直接取对方板厚，所以视觉上会像整条边整体长出去一截

现在的约束是：

- `roof.bottom -> wall.top`：不改 outline
- `hinged roof.top -> hinged roof.top`：允许改 outline，但只改屋脊那一段

### 6. 屋脊 finger joint 的局部化策略

屋脊接缝现在不是整条顶边都长齿，而是只改中间一段：

1. 先识别 `isHingedRidgeConnection`
2. 计算一个 `inset`，把 joint 区间从左右端点往里收
3. 把 top edge 视为三段：
   - 右侧保留直线
   - 中间做 finger joint
   - 左侧保留直线
4. 针对这段中间区间重新计算 `fingerCount / fingerWidth`

这一步很关键：如果仍按整条边算 finger width，齿列会溢出到区间外，看起来像“修了局部 joint 但还是整条边都变了”。

### 7. 为什么 eave 和 ridge 的策略不同

当前实现把这两个连接分开对待：

- **eave**：`bottom -> top`
  - 只保留连接语义
  - 不改墙，也不改屋顶底边外轮廓
- **ridge**：`top -> top`
  - 保留可见的 interlocking seam
  - 但限制在中段，避免破坏顶角轮廓

这就是现在 finger joint 算法最重要的产品约束。

## Boxel 算法

### 1. 世界坐标和局部坐标的换算

`BoxelAssembly` 只存：

- `origin`
- 本地整数 `cells`

`packages/core/src/boxel.ts` 负责把它们转成 world grid：

- `toWorldGridCell()`
- `toWorldGridCells()`
- `toLocalAssembly()`

这样 merge / split 后可以重新选一个新的局部原点，而不是把所有 cell 永远固定在第一次创建时的局部坐标里。

### 2. 列高算法

同一列继续往上摞用的是：

- `getBoxelColumnHeight(assembly, column)`
- `appendBoxelCellAboveColumn(assembly, column)`

逻辑就是扫描同一 `(x, y)` 列的最大 `z`，再加一。

### 3. 地面点击提交算法

`commitBoxelAtColumn(document, column)` 处理点空地或点地面网格：

- 如果这列已经是某个 assembly 的 origin column，就直接往上摞
- 否则看新 cell 是否与已有 assembly 在 `X/Y` 上 face-adjacent
  - 有邻接：合并
  - 没邻接：创建新 assembly

这里“相邻”只看同层的 `X/Y` 面接触，不把对角线算进去。

### 4. 点击已有 boxel 的面

`commitBoxelFromAssemblyCell(document, assemblyId, cell, faceNormal)` 处理点实体的情况。

它先根据 `event.face.normal` 决定目标 world cell：

- 顶面：继续往上摞
- 侧面：沿法线方向侧向新增

算出目标 world cell 后，再和其他 assembly 跑同一套 face-adjacent merge 逻辑。

所以 boxel mode 现在有两类入口：

- 地面入口：按 column
- 实体入口：按点击到的 face

### 5. 合并与拆分

boxel 的连通性核心是 world-grid 上的 connected components：

- `mergeAssembliesThroughWorldCell()`：把目标 cell 和若干 assembly 的 world cells 合并，再重新局部化
- `splitAssemblyIntoConnectedComponents()`：删除一个 cell 后，对剩余 world cells 做 DFS/BFS，拆成多个连通块

邻居集合 `NEIGHBOR_OFFSETS` 同时包含 `±X / ±Y / ±Z`，所以拆分时使用的是完整三维六邻接。

### 6. Joint candidate 派生

`buildJointCandidates()` 目前只在同层找：

- `x + 1`
- `y + 1`

也就是把可见的水平 face-to-face 邻接条标出来，供 editor 高亮，不写回持久化数据。

## Gable roof 算法

`addGableRoofToGroup()` 的关键不是找两面墙的起点直线距离，而是：

1. 找出一对平行 upright 墙
2. 用两条墙基线之间的 **垂直距离** 作为 roof span
3. `roofPanelWidth = (span / 2) / cos(pitch)`
4. 用 `flipPitch` 决定屋面朝组中心还是背向组中心

这样即使两面墙的起点不在同一端，或者其中一面墙反向放置，roof panel 的高度也仍然只反映真实跨距。

## 当前算法边界

### Finger joint

- 依赖离散的 `top/left/right/bottom` anchor，而不是任意 edge segment 约束
- ridge 现在虽然支持局部段，但仍是规则化区间，不是精确求交出来的接缝长度
- 轮廓是折线改写，不是布尔实体运算

### Boxel

- merge / split 的 source of truth 是 grid connectivity，不是 mesh 关系
- 地面点击和实体点击已经分流，但 preview 仍以当前 3D 交互层为主，不是完全独立的 solver

如果后面继续演进，这两套算法最值得继续抽象的点分别是：

- finger joint：从“整条 edge / 固定中段”升级到“任意 edge segment”
- boxel：把 face-hit preview 和提交逻辑完全统一成一个可复用 target-cell solver
