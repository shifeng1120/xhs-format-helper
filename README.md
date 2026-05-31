# 🎨 小红书排版助手 - XHS Format Helper

一款专为小红书创作者打造的 Chrome 插件，在小红书 PC 端编辑器中注入排版工具栏，让笔记排版更美观。

> 📖 详细安装步骤见：[用户安装指南](assets/installation-guide.md)

---

## ✨ 功能一览

| 功能 | Free | Pro |
|------|:----:|:---:|
| 调整字号（小/中/大/特大） | ✅ | ✅ |
| 调整行距 | ✅ | ✅ |
| 文字颜色选择 | ✅ | ✅ |
| 加粗 / 对齐（左/中/右） | ✅ | ✅ |
| 📐 **排版模板**（5 套专业模板） | ❌ | ✅ |
| 🎨 **配色方案**（10 套配色） | ❌ | ✅ |
| 🧹 **格式清理**（一键统一全文） | ❌ | ✅ |
| 💾 **自定义模板保存** | ❌ | ✅ |
| 🏷️ **话题标签管理** | ❌ | ✅ |

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
| Free | **¥0** | 下载即用 |
| Pro 永久 | **¥29.9** | [爱发电购买激活码](https://afdian.com/item/b4dab2045cf111f18bfd52540025c377) |

购买 Pro 后，在插件设置页输入激活码即可永久解锁全部功能。

---

## 📁 项目结构

```
xhs-format-helper/
├── extension/              # Chrome 插件源码
│   ├── manifest.json       # 插件配置 (Manifest V3)
│   ├── content/
│   │   ├── content.js      # 工具栏注入 + 排版功能
│   │   └── styles.css      # 工具栏样式
│   ├── popup/
│   │   ├── popup.html      # 设置页
│   │   └── popup.js        # Pro 激活 + 统计
│   ├── background/
│   │   └── service-worker.js
│   ├── lib/
│   │   ├── storage.js      # Chrome Storage 封装
│   │   ├── license.js      # License 验证
│   │   ├── templates.js    # 5 套排版模板
│   │   └── colors.js       # 10 套配色方案
│   └── icons/              # 插件图标
├── assets/
│   ├── installation-guide.md # 用户安装指南
│   └── store-description.txt # 商店描述
├── payment/
│   ├── mianbaoduo-setup.md   # 面包多支付配置指南
│   └── activation-codes-200.txt # 激活码库（供面包多自动发货）
└── README.md
```

---

## 🛠 技术栈

- **Manifest V3** — Chrome 扩展最新标准
- **纯 JavaScript**（零依赖，无框架）
- **Chrome Storage Sync API** — 设置云端同步
- **面包多支付** — 国内个人收款，无需公司资质
- **零后端** — 全本地运行，用户隐私安全

---

## 🚀 分发渠道

| 渠道 | 状态 | 说明 |
|------|:----:|------|
| GitHub Release | ✅ 已就绪 | 下载即用，版本管理 |
| GitHub Repo | ✅ 已就绪 | 源码开源，接受 Issue |
| 面包多支付 | ❌ 已下线 | 平台关闭，已迁移 |
| 爱发电支付 | ✅ 已上架 | ¥29.9 购买 Pro 激活码 |
| Edge 扩展商店 | 📋 计划上架 | 兼容 Chrome 插件 |
| Chrome Web Store | ❌ 暂不 | Google 账号受限 |

---

## 📞 联系 & 反馈

- **GitHub Issues**：报告 Bug / 建议新功能
- **邮箱**：1398210194@qq.com
