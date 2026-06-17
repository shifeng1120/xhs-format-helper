# 面包多支付配置指南

> 面包多 (mianbaoduo.com) 是国内创作者常用的支付工具，
> 支持微信/支付宝收款，个人可注册，无需公司资质。

---

## 1. 注册面包多

1. 打开 [mianbaoduo.com](https://mianbaoduo.com)
2. 点击「注册」，用微信扫码注册
3. 完成实名认证（需要身份证 + 银行卡）

## 2. 创建商品

1. 登录后点击「发布作品」
2. 填写商品信息：

| 字段 | 填写内容 |
|------|---------|
| 商品类型 | 虚拟商品（数字内容/激活码） |
| 商品名 | 红薯创作助手 Pro 激活码 |
| 价格 | ¥9.90 / ¥68 年付 / ¥129 早鸟终身 |
| 简介 | 见下方文案 |
| 发货方式 | 自动发货（文本/激活码） |

**商品简介文案：**
```
红薯创作助手 Pro 激活码

购买后你将获得：
✅ 智能排版、手机预览、账号风格库和本地草稿，一键套用
✅ 10 套配色方案
✅ 格式清理，一键统一全文
✅ 自定义模板保存
✅ 话题标签管理

使用方式：
1. 购买后获得激活码（格式：XHS-PRO-XXXX-XXXX-XX）
2. 打开插件设置页 → 点击「已有激活码」→ 输入激活码
3. 激活成功后自动解锁所有 Pro 功能

注意：
- 本商品为虚拟商品，一经售出概不退款
- 一个激活码仅限一台设备使用
- 支持离线激活，无需联网
```

## 3. 设置自动发货

1. 在商品设置中找到「自动发货」
2. 选择「文本内容」
3. 在文本框中输入：

```
感谢开通红薯创作助手 Pro！

你的激活码是：{code}

使用方式：
1. 打开 Chrome 浏览器 → 点击插件图标
2. 在弹出页点击「已有激活码？点击输入」
3. 输入上面的激活码即可解锁 Pro

如有问题请联系：your-email@example.com
```

4. 在「激活码库」中上传一批预生成的激活码
   - 使用下面的生成器在本地生成 200 个激活码

## 4. 获取支付链接

1. 商品创建完成后，复制「商品链接」
2. 替换 `popup.js` 中的 `BUY_URL` 为这个链接
3. 替换 `content.js` 中 `showProModal` 函数里的支付链接

## 5. 批量生成激活码

使用浏览器控制台运行以下代码，或在 Node.js 中运行：

```javascript
// 批量生成 200 个激活码
function generateKey(index) {
  const prefix = 'XHS-PRO-';
  const userPart = ('BATCH' + index).slice(-4).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase() + String(index).padStart(2,'0');
  let sum = 0;
  const str = userPart + timePart;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  const check = (sum % 256).toString(16).toUpperCase().padStart(2, '0');
  return `${prefix}${userPart}-${timePart.slice(0,4)}-${check}`;
}

// 睡眠函数避免时间戳重复
const keys = [];
for (let i = 0; i < 200; i++) {
  keys.push(generateKey(i));
}

console.log(keys.join('\n'));
// 复制输出，粘贴到面包多「激活码库」
```

> ⚠️ 注意：激活码是本地验证的简单方案，
> 用户量大了以后（100+ 付费用户），建议升级为服务器验证。
