#!/usr/bin/env node
/**
 * 本地语法检查：node extension/scripts/check-syntax.js
 */
const fs = require('fs');
const path = require('path');

function walk(dir, list = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f === 'scripts') continue;
      walk(p, list);
    } else if (f.endsWith('.js')) {
      list.push(p);
    }
  }
  return list;
}

const root = path.join(__dirname, '..');
const files = walk(root);
let fail = 0;

for (const f of files) {
  const rel = path.relative(root, f);
  try {
    new Function(fs.readFileSync(f, 'utf8'));
    console.log('OK', rel);
  } catch (e) {
    console.error('FAIL', rel, '-', e.message);
    fail++;
  }
}

if (fail) {
  console.error('\n' + fail + ' file(s) failed syntax check');
  process.exit(1);
}
console.log('\nAll', files.length, 'files passed');
