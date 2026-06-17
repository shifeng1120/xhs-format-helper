#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'content', 'styles.css'), 'utf8');

const failures = [];

if (/anchor\.insertBefore\(panel,\s*editor\.nextSibling\)/.test(content)) {
  failures.push('attachPanel still inserts panels into the editor flow');
}

if (/editor\.parentNode\?\.insertBefore\(panel,\s*editor\.nextSibling\)/.test(content)) {
  failures.push('a feature panel still inserts directly after the editor');
}

if (!/function attachPanel[\s\S]*panel\.classList\.add\('xhs-fmt-panel-floating'\)[\s\S]*document\.body\.appendChild\(panel\)/.test(content)) {
  failures.push('attachPanel should append floating panels to document.body');
}

for (const token of ['.xhs-fmt-panel-floating', 'max-height: min(720px, calc(100vh - 64px))', 'overflow: auto']) {
  if (!styles.includes(token)) failures.push(`styles.css missing ${token}`);
}

if (failures.length) {
  console.error('Floating panels check failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Feature panels float above the editor and remain scrollable.');
