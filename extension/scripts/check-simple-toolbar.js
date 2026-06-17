#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'content', 'styles.css'), 'utf8');

const failures = [];

if (!content.includes('更多工具')) {
  failures.push('toolbar should expose a single more-tools toggle');
}

if (!content.includes('xhs-fmt-more-tools')) {
  failures.push('secondary tools should live in a hidden more-tools container');
}

for (const label of ['🤖 AI配图', '👤 风格', '🗂️ 草稿', '🧹 清理', '🏷️ 标签']) {
  const directAppend = `toolControls.appendChild(createBtnText('${label}`;
  if (content.includes(directAppend)) {
    failures.push(`${label} should not be appended directly to the always-visible toolbar`);
  }
}

if (!styles.includes('.xhs-fmt-more-tools')) {
  failures.push('styles.css should define the collapsed more-tools container');
}

if (!styles.includes('.xhs-fmt-more-tools.show')) {
  failures.push('styles.css should define the expanded more-tools container');
}

if (failures.length) {
  console.error('Simple toolbar check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Toolbar keeps secondary tools behind a more-tools toggle.');
