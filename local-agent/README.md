# Hermes Local Agent for Xiaohongshu Publishing

This agent runs on a user's Windows computer, connects to a Hermes Gateway through WebSocket, and controls the user's local Chrome browser with Playwright.

The first version only supports one capability:

- `xhs.publish_note`: open the Xiaohongshu creator publish page, upload images, fill the title and content, and optionally click the publish button.

For safety, keep `XHS_CONFIRM_BEFORE_PUBLISH=true` for distributed users. In that mode the agent prepares the draft and leaves the final publish click to the user.

## Install

```powershell
cd local-agent
npm install
copy .env.example .env
```

Edit `.env` and set:

```text
HERMES_GATEWAY_URL=ws://your-server.example.com/agent/ws
HERMES_AGENT_TOKEN=the-token-created-for-this-device
HERMES_USER_ID=the-hermes-user-id
HERMES_DEVICE_ID=the-local-device-id
XHS_CHROME_USER_DATA_DIR=C:\xhs-hermes-agent-profile
XHS_CONFIRM_BEFORE_PUBLISH=true
XHS_HEADLESS=false
```

## Run

```powershell
npm start
```

The first run opens a dedicated Chrome profile. The user should log in to Xiaohongshu in that browser window.

## Local Demo

Terminal 1:

```powershell
cd local-agent
npm run demo:gateway
```

Terminal 2:

```powershell
cd local-agent
npm start
```

Terminal 3:

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

The agent should open the Xiaohongshu creator page and fill the draft.
