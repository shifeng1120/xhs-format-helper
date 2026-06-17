#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');

const failures = [];

if (!content.includes('function toCoverTitleText')) {
  failures.push('cover defaults need a dedicated short-title sanitizer');
}

if (!content.includes('toCoverTitleText(getCurrentNoteTitle()')) {
  failures.push('cover title should sanitize and clamp the current note title');
}

if (!content.includes('toCoverTitleText(extracted.title')) {
  failures.push('cover title should sanitize and clamp extracted body title');
}

if (!content.includes('const autoTitle = toCoverTitleText(getCurrentNoteTitle()) || toCoverTitleText(imgGen.extractTitle(sourceText));')) {
  failures.push('image card title should sanitize and clamp extracted body title');
}

if (!/slice\(0,\s*18\)/.test(content)) {
  failures.push('cover title sanitizer should clamp long generated titles');
}

if (failures.length) {
  console.error('Cover title safety check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Cover defaults sanitize and clamp generated titles.');
