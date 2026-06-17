#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'content', 'styles.css'), 'utf8');

const requiredContent = [
  'DRAFT_CONTEXT_KEY',
  'saveDraftContextFromEditor',
  'ensurePublishCaptionHelper',
  'buildSafePublishCaption',
  'xhs-fmt-caption-helper',
  'replaceEditorContent',
  '填写标题会有更多赞哦',
  'if (!titleEl) return;',
];

const requiredStyles = [
  '.xhs-fmt-caption-helper',
  '.xhs-fmt-caption-helper button',
  'bottom: 148px',
];

const failures = [];

for (const token of requiredContent) {
  if (!content.includes(token)) failures.push(`content.js missing ${token}`);
}

for (const token of requiredStyles) {
  if (!styles.includes(token)) failures.push(`styles.css missing ${token}`);
}

if (failures.length) {
  console.error('Publish caption helper check failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Publish caption helper is present.');
