# AI 拟人助手（3D）说明

## 已完成
- 新增 3D 拟人助手组件：`frontend/src/components/VrmAvatar.vue`
  - 基于 three.js + @pixiv/three-vrm
  - 支持 VRM 模型加载；说话时驱动口型（aa/ih/ou）、说话中自动眨眼、情绪表情（happy/sad）
  - 待机呼吸、轻微摆头、鼠标拖拽旋转
  - 模型缺失时自动降级为程序化占位形象（白大褂 + 听诊器），保证页面可用
- 已接入医生端 AI 助手页面：`frontend/src/views/ai/index.vue`
  - 对话区上方新增 3D 助手面板（avatar-panel）
  - 与后端 AI 对话状态联动：提问时表情 thinking，回答时口型动，回答完短暂 happy
  - 右上角"换个形象"按钮可重新挂载
- 新增独立预览页（免登录查看）：`frontend/avatar-preview.html`

## 使用

### 1. 安装依赖（首次）
```bash
cd frontend
npm install
```

### 2. 放入人物模型
把你的 3D 人物模型（`.vrm` 格式最佳，也可 `.glb`/`.gltf`）放到：
```
frontend/public/models/assistant.vrm
```
组件默认加载该路径，无需改代码。
- 若无模型文件，会自动显示内置占位形象。

### 3. 查看效果
- 独立预览（无需登录/后端）：
```bash
npm run dev
# 浏览器打开 http://localhost:5173/avatar-preview.html
```
- 正式页面：启动后端后，登录 → 左侧菜单「AI健康助手」

## 换成"图片里的人物"
当前项目内没有可加载的人物 VRM 模型（外网下载受限），因此显示的是占位形象。
要换成目标人物，任选其一：
1. 用 3D 建模软件（VRoid Studio / Blender）照着人物照片/插画做一个 `.vrm`，放到上表路径；
2. 用"图生 3D"工具（如基于单图的 3D 生成）产出网格后转成 `.vrm`；
3. 购买/下载现成 VRM 虚拟人替换。

> 注意：若人物为真人照片，用于建模需获得本人肖像授权。

## 技术参数
- three: ^0.170.0
- @pixiv/three-vrm: ^3.0.0
- 组件 props：`modelUrl` / `name` / `speaking` / `emotion` / `draggable` / `showName`
