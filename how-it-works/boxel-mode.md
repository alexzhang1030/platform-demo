# Boxel Mode

## 目标

`boxel-mode` 是 editor 里的第二种 3D 创建方式：

- 点击地面上的一个网格列，创建一个新的 `BoxelAssembly`
- 点击同层相邻列，可以沿 `X / Y` 扩展并自动并入同一个 assembly
- 再次点击同一列，沿 `Z` 轴向上叠一个新的 boxel
- 删除单个 boxel 时，如果剩余结构断开，会自动拆成多个 assemblies

当前版本仍然只支持统一 cell 尺寸，但 assembly 语义已经不再是“一个列 stack 的编辑历史”，而是“一个由 face-connected boxels 形成的整体”。

## 关键文件

- `apps/web/src/components/pattern-studio/board-preview-3d.tsx`
- `apps/web/src/components/pattern-studio/editor-page.tsx`
- `apps/web/src/lib/pattern-studio.ts`
- `packages/core/src/boxel.ts`
- `packages/protocol/src/index.ts`

## 数据模型

`PatternDocument` 现在除了 `boards` 之外，还有 `assemblies`：

- `BoxelAssembly.id` / `name`
- `cellSize`
- `origin`
- `cells`

`cells` 只存整数网格坐标 `{ x, y, z }`。  
`origin` 表示这个 assembly 在世界坐标里的局部基准列位置。  
具体 cube 的世界坐标、包围盒、joint candidates、以及 merge / split 后的新局部坐标都由 `packages/core/src/boxel.ts` 在运行时派生。

这样 boxel 数据不会被提前拍平成很多块 board，assembly 仍然是 source of truth。

## 创建和叠加流程

`BoardPreview3D` 现在有两条 create path：

- `create-board`
- `boxel-mode`

两者共用同一个地面 hit plane 和网格吸附入口，但提交逻辑不同。

在 add 模式下：

1. 鼠标移动时先拿到吸附后的地面列
2. 如果点击的是已有列，就把 preview 放在该列当前最高 cell 之上
3. 如果点击的是空列，就先预览一个 floor-level cell
4. 提交时检查这个新 cell 是否和已有 assemblies 在 `X / Y` 上 face-to-face 接触
5. 点击后调用 `commitBoxelAtColumn`

`commitBoxelAtColumn` 做两件事之一：

- 空列：创建新 assembly，写入 `{ x: 0, y: 0, z: 0 }`
- 已有列：对同一个 assembly 调用 `appendBoxelCellAboveColumn`
- 邻接空列：如果新 cell 接触一个或多个已有 assemblies，就把它们 merge 成一个新的 connected assembly

也就是说，“一次点击属于哪个 assembly”不再靠历史决定，而是靠连通关系决定。

## 为什么 boxel 逻辑分到 core

共享出去的是这些纯计算：

- 某个 cell 是否已占用
- 某个 column 当前有多高
- 新 cell 应该叠到哪一层
- cell 世界坐标
- assembly 包围盒
- face adjacency
- connected-component split
- merge-through-bridge
- `Joint Candidate` 派生

这些逻辑都不依赖 React 或 three，放在 `packages/core/src/boxel.ts` 后，editor、generator 或后续导出逻辑都能复用。

## 选择模型

`EditorSelectionState` 不再只跟踪 board：

- `activeBoardId` / `selectedBoardIds`
- `activeAssemblyId` / `selectedAssemblyIds`

当前实现保持一个简单规则：

- 选 board 时清空 assembly selection
- 选 assembly 时清空 board selection

这样 `SelectionOutline` 仍然只需要拿到一组已选中的 3D object，不需要理解实体类型。

assembly 的 id 在 merge / split 后可能变化，但选择仍然只认“当前结果 assembly”，不认旧的编辑历史。

## 渲染方式

`BoardPreview3D` 新增了 `BoxelAssemblyMesh`：

- 每个 persisted cell 渲染成一个 `boxGeometry`
- preview 时会额外附加一个半透明 cube
- assembly 级 `group` 会注册到 selection outline 使用的 object map 里

此外，当前实现会为已选中的 assembly 渲染绿色的 `Joint Candidate` bars。  
这些 bars 不是持久化数据，而是通过 `getAssemblyJointCandidates` 从 face-to-face 邻接关系即时派生出来的。

因为 preview、persisted render 和 joint feedback 都来自同一套 assembly + adjacency 规则，hover、选中、提交和删除后的视觉结果是一致的。

## 删除单个 boxel

删除不是“删整个 assembly”，而是 `removeBoxelFromAssembly`：

1. 找到被点击的那个 cell
2. 从 assembly 的 `cells` 里移除它
3. 对剩余 cells 跑 connected-components
4. 如果还是一个连通块，就更新原 assembly
5. 如果断成多个连通块，就生成多个新的 assemblies

这样桥接块被删掉后，结构会自动从一个整体拆回多个整体。

## 和 generator 的关系

当前 generator 仍然只输出 board 的 SVG。  
`assemblies` 会保留在 JSON 里，也会在 generator 面板上明确提示“还未参与 SVG board output”。

这让 boxel authoring 可以先落地，而不会假装已经定义好了最终的制造输出。
