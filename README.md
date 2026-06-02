# 🎨 小红书排版助手 - XHS Format Helper

一款专为小红书创作者打造的 Chrome 插件，在小红书 PC 端编辑器中注入排版工具栏，让笔记排版更美观。

> 📖 详细安装步骤见：[用户安装指南](assets/installation-guide.md)

---

## ✨ 功能一览

| 功能 | Free | 试用期 | Pro |
|------|:----:|:------:|:---:|
| 调整字号（小/中/大/特大） | ✅ | ✅ | ✅ |
| 调整行距 | ✅ | ✅ | ✅ |
| 文字颜色选择 | ✅ | ✅ | ✅ |
| 加粗 / 对齐（左/中/右） | ✅ | ✅ | ✅ |
| 📐 **排版模板**（5 套专业模板） | ❌ | ✅ | ✅ |
| 🎨 **配色方案**（10 套配色） | ❌ | ✅ | ✅ |
| 🧹 **格式清理**（一键统一全文） | ❌ | ✅ | ✅ |
| 🏷️ **话题标签管理** | ❌ | ✅ | ✅ |
| 💾 **自定义模板保存** | ❌ | ❌ | ✅ |
| 🔄 **全功能试用** | — | **3 天** | — |

> 🆕 **v1.1.0 新增**：首次安装自动获得 **3 天全功能试用**，所有 Pro 功能开箱即用！到期后自动降级为免费版。

---

## 📥 下载安装

### 方式一：GitHub Release（推荐）
1. 下载最新版：https://github.com/shifeng1120/xhs-format-helper/releases
2. 解压 `.zip` 文件
3. Chrome 打开 `chrome://extensions` → 开启「开发者模式」
4. 点击「加载已解压的扩展程序」→ 选择解压文件夹

> 📖 图文详细步骤 → [用户安装指南](assets/installation-guide.md)

### 方式二：Edge 浏览器（即将上架）
Edge 扩展商店搜索「小红书排版助手」即可安装（Chrome 插件兼容）。

### 方式三：百度网盘（备用下载）
链接：_（待创建）_

---

## 💰 变现模式

| 版本 | 价格 | 获得方式 |
|------|:----:|---------|
| Free | **¥0** | 下载即用（基础功能） |
| 试用版 | **¥0** | 安装后自动获得 3 天全功能试用 |
| Pro 永久 | **¥29.9** | [爱发电购买激活码](https://afdian.com/item/b4dab2045cf111f18bfd52540025c377) |

购买 Pro 后，在插件设置页或工具箱中点击「已有激活码？」输入激活码即可永久解锁全部功能。

---

## 📁 项目结构

```
xhs-format-helper/
├── extension/              # Chrome 插件源码
│   ├── manifest.json       # 插件配置 (Manifest V3)
│   ├── content/
│   │   ├── content.js      # 工具栏注入 + 所有排版功能（含模板/配色/标签）
│   │   └── styles.css      # 工具栏 + 面板样式
│   ├── popup/
│   │   ├── popup.html      # 设置页（含试用/激活 UI）
│   │   └── popup.js        # 试用状态 + Pro 激活 + 统计
│   ├── background/
│   │   └── service-worker.js  # 试用期跟踪 + 统计 + 消息路由
│   ├── lib/
│   │   ├── storage.js      # Chrome Storage 封装
│   │   ├── license.js      # License 生成/验证
│   │   ├── templates.js    # 5 套排版模板定义
│   │   └── colors.js       # 10 套配色方案定义
│   └── icons/              # 插件图标
├── assets/
│   ├── installation-guide.md # 用户安装指南
│   └── store-description.txt # 商店描述
├── payment/
│   └── activation-codes-200.txt # 激活码库
└── README.md
```

---

## 🛠 技术栈

- **Manifest V3** — Chrome 扩展最新标准
- **纯 JavaScript**（零依赖，无框架）
- **Chrome Storage Sync API** — 设置云端同步
- **Chrome Storage Local API** — 试用期本地存储
- **爱发电支付** — 国内个人收款，无需公司资质
- **零后端** — 全本地运行，用户隐私安全

---

## 🚀 分发渠道

| 渠道 | 状态 | 说明 |
|------|:----:|------|
| GitHub Release | ✅ 已就绪 | 下载即用，版本管理 |
| GitHub Repo | ✅ 已就绪 | 源码开源，接受 Issue |
| 爱发电支付 | ✅ 已上架 | ¥29.9 购买 Pro 激活码 |
| Edge 扩展商店 | 📋 计划上架 | 兼容 Chrome 插件 |
| Chrome Web Store | ❌ 暂不 | Google 账号受限 |

---

## 📞 联系 & 反馈

- **GitHub Issues**：报告 Bug / 建议新功能
- **邮箱**：1398210194@qq.com
