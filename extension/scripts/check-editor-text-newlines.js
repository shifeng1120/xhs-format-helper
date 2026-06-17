#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib', 'editor-utils.js'), 'utf8');

const fnMatch = source.match(/function getEditorTextRobust\(editor\) \{[\s\S]*?\n  \}/);
const failures = [];

if (!fnMatch) {
  failures.push('getEditorTextRobust not found');
} else {
  const fn = fnMatch[0];
  const innerTextIndex = fn.indexOf('editor.innerText');
  const walkerIndex = fn.indexOf('createTreeWalker');
  if (innerTextIndex < 0) failures.push('getEditorTextRobust should read editor.innerText for contenteditable blocks');
  if (walkerIndex < 0) failures.push('getEditorTextRobust should keep walker fallback');
  if (innerTextIndex > walkerIndex) failures.push('editor.innerText should be used before text-node walker to preserve paragraphs');
}

if (failures.length) {
  console.error('Editor text newline check failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Editor text extraction preserves visible newlines first.');
