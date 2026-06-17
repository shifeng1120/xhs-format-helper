#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'content', 'styles.css'), 'utf8');

const requiredContent = [
  'createToolbarGroup',
  'xhs-fmt-toolbar-main',
  'xhs-fmt-toolbar-style',
  'xhs-fmt-toolbar-tools',
];

const requiredStyles = [
  '.xhs-fmt-toolbar-group',
  '.xhs-fmt-toolbar-group-label',
  '.xhs-fmt-toolbar-controls',
  '.xhs-fmt-toolbar-main',
  '.xhs-fmt-toolbar-style',
  '.xhs-fmt-toolbar-tools',
];

const missing = [];

for (const token of requiredContent) {
  if (!content.includes(token)) missing.push(`content.js missing ${token}`);
}

for (const token of requiredStyles) {
  if (!styles.includes(token)) missing.push(`styles.css missing ${token}`);
}

if (missing.length) {
  console.error('Toolbar layout check failed:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Toolbar layout groups are present.');
