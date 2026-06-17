# Hermes Local Agent 控制本机浏览器发布小红书教程

## 目标

让部署在服务器上的 Hermes WebUI 不能直接接管用户电脑，而是通过“用户本机 Local Agent 主动连接服务器”的方式控制用户自己的 Chrome 浏览器。

这个方案适合多用户场景：

- 每个用户在自己的 Windows 电脑运行 Local Agent。
- 每个 Agent 只绑定自己的 Hermes 用户和设备。
- Hermes Gateway 只把任务发给对应用户的对应设备。
- 小红书登录态保存在用户本机 Chrome profile，不上传到服务器。
- 默认只准备草稿，最终发布由用户自己确认。

## 架构

```text
Hermes WebUI
  -> Hermes Gateway
  -> WebSocket task.run
  -> 用户 Windows Local Agent
  -> Playwright 控制本机 Chrome
  -> 打开小红书创作者中心并填写草稿
```

## 一、服务器端需要实现 Hermes Gateway

Gateway 至少需要两个能力：

1. 接收 Local Agent 的 WebSocket 连接。
2. 接收 Hermes 创建的发布任务，并转发给指定用户设备。

WebSocket 地址示例：

```text
wss://your-hermes-server.example.com/agent/ws
```

Agent 上线后会发送：

```json
{
  "type": "agent.hello",
  "userId": "user-001",
  "deviceId": "windows-pc-001",
  "token": "agent-token",
  "capabilities": ["xhs.publish_note"]
}
```

Gateway 下发任务：

```json
{
  "type": "task.run",
  "taskId": "task-001",
  "tool": "xhs.publish_note",
  "payload": {
    "title": "小红书标题",
    "content": "小红书正文",
    "imagePaths": ["D:\\素材\\cover.png"],
    "publish": false
  }
}
```

Agent 返回结果：

```json
{
  "type": "task.result",
  "taskId": "task-001",
  "ok": true,
  "result": {
    "draftReady": true,
    "published": false
  }
}
```

## 二、用户电脑安装 Local Agent

要求：

- Windows 10 或 Windows 11
- Chrome 浏览器
- Node.js 20 或更高版本
- 能访问你的 Hermes Gateway 地址

安装：

```powershell
cd local-agent
npm install
copy .env.example .env
```

编辑 `.env`：

```text
HERMES_GATEWAY_URL=wss://your-hermes-server.example.com/agent/ws
HERMES_AGENT_TOKEN=replace-with-agent-token
HERMES_USER_ID=user-001
HERMES_DEVICE_ID=windows-pc-001
XHS_CHROME_USER_DATA_DIR=C:\xhs-hermes-agent-profile
XHS_CONFIRM_BEFORE_PUBLISH=true
XHS_HEADLESS=false
```

启动：

```powershell
npm start
```

第一次启动会打开一个独立 Chrome 窗口。用户需要在这个窗口里登录小红书创作者中心。

## 三、本地演示跑通

先启动示例 Gateway：

```powershell
cd local-agent
npm run demo:gateway
```

再启动 Agent：

```powershell
cd local-agent
npm start
```

发送测试任务：

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8787/tasks/xhs-publish" `
  -ContentType "application/json" `
  -Body '{
    "deviceId": "windows-pc-001",
    "title": "测试标题",
    "content": "这是一篇由 Hermes Local Agent 填写的小红书草稿。",
    "imagePaths": [],
    "publish": false
  }'
```

如果用户已经登录小红书，本机 Chrome 会打开发布页面并填写草稿。

## 四、分发给多用户时怎么配置

每个用户一个独立设备 token：

```text
user-001 / windows-pc-001 / token-a
user-002 / windows-pc-002 / token-b
user-003 / office-pc-001 / token-c
```

Gateway 必须校验：

- token 是否有效。
- token 是否属于该 userId。
- deviceId 是否属于该用户。
- 任务的目标 deviceId 是否在线。
- 任务的 tool 是否在该设备 capabilities 里。

不要让用户共用一个 token。

## 五、安全建议

默认保持：

```text
XHS_CONFIRM_BEFORE_PUBLISH=true
```

这样 Agent 只会准备草稿，不会自动点最终发布按钮。用户确认标题、正文、图片无误后，自己点击发布。

不要把 Chrome 远程调试端口暴露到公网。

不要把用户的小红书 cookie 上传到服务器。

不要让服务器任意读取用户电脑文件。图片路径应该来自用户本机配置好的素材目录，后续如需扩展文件能力，必须做目录白名单。

## 六、接入 Hermes WebUI 的方式

在 Hermes 里新增一个工具或 MCP tool：

```text
xhs.publish_note
```

输入参数：

```json
{
  "deviceId": "windows-pc-001",
  "title": "标题",
  "content": "正文",
  "imagePaths": ["D:\\素材\\1.png"],
  "publish": false
}
```

Hermes 服务端收到后创建任务，Gateway 转发给对应 Local Agent。

第一版不要做“全自动发布”，先做“自动填草稿 + 用户确认发布”。这更适合分发给多人使用，也更容易排查问题。
