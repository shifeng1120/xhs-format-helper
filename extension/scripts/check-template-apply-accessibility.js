#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');

const failures = [];

if (!content.includes("applyBtn.setAttribute('aria-label', `套用${tpl.name}模板`)")) {
  failures.push('template apply buttons need unique aria-label text with the template name');
}

if (!content.includes('applyBtn.title = `套用${tpl.name}模板`;')) {
  failures.push('template apply buttons need unique title text with the template name');
}

if (failures.length) {
  console.error('Template apply accessibility check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Template apply buttons expose unique template labels.');
