#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'lib', 'format-engine.js'), 'utf8');
const sandbox = { window: {}, self: {}, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const engine = sandbox.window.XhsFormatEngine;
const template = {
  id: 'operator',
  name: '账号运营',
  category: '运营',
  rules: {
    hookEmoji: '📈',
    listTitle: '🔍 运营动作',
    useStepNumber: true,
    stepBullet: '➡️',
    forceList: true,
    boldKeywords: true,
    maxLineLength: 24,
    addCTA: true,
    ctaText: '📌 做账号的朋友建议收藏这套流程',
  },
};

const raw = [
  '今天测试红薯创作助手',
  '用户做内容经常卡住不是不会写是东西太乱',
  '比如产品介绍一堆功能 备忘录一堆想法 聊天记录里面也有观点',
  '真正整理之前就不知道先说哪个',
  '我觉得工具应该帮人做整理而不是替人胡编',
  '第一步提炼主线 第二步拆成适合手机看的段落 第三步生成封面和图文卡片',
].join('\n');

const formatted = engine.formatWithTemplate(raw, template);
const failures = [];

if (!formatted.includes('用户做内容经常卡住不是不会写是东西太乱')) {
  failures.push('formatted output should preserve the original semantic line about user pain');
}

if (/Step\d\s+是东西太乱比如/.test(formatted)) {
  failures.push('formatted output still starts a step from a mid-sentence fragment');
}

if (/红薯创作助手用户做内容/.test(formatted)) {
  failures.push('formatted output collapsed adjacent original lines');
}

if (!formatted.includes('🔍 运营动作')) {
  failures.push('formatted output should keep the selected template structure');
}

if (failures.length) {
  console.error('Format quality check failed:');
  for (const item of failures) console.error(`- ${item}`);
  console.error('\nFormatted output:\n' + formatted);
  process.exit(1);
}

console.log('Format quality preserves semantic lines.');
