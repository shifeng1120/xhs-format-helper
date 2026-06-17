#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');

const failures = [];

if (!content.includes('function inlineRichTextHtml')) {
  failures.push('mobile preview should use an inline rich-text renderer');
}

if (!content.includes('<strong>')) {
  failures.push('mobile preview should render **bold** markers as strong text');
}

if (!content.includes('inlineRichTextHtml(line)')) {
  failures.push('renderPreviewHtml should pass preview lines through inlineRichTextHtml');
}

if (failures.length) {
  console.error('Preview bold rendering check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Mobile preview renders bold markers as inline emphasis.');
