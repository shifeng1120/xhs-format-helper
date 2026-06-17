#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');

const required = [
  'getCurrentNoteTitle',
  'sanitizeCoverText',
  'toCoverTitleText',
  'textarea[placeholder="输入标题"]',
  'replace(/[\\uFFFD]/g',
  'const title = toCoverTitleText(getCurrentNoteTitle())',
];

const failures = [];
for (const token of required) {
  if (!content.includes(token)) failures.push(`content.js missing ${token}`);
}

if (failures.length) {
  console.error('Cover defaults check failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Cover defaults prefer the note title and sanitize noisy text.');
