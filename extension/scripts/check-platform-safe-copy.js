#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const repo = path.join(root, '..');

const files = [
  ['manifest.json', path.join(root, 'manifest.json')],
  ['popup.html', path.join(root, 'popup', 'popup.html')],
  ['content.js', path.join(root, 'content', 'content.js')],
  ['README.md', path.join(repo, 'README.md')],
  ['store-description.txt', path.join(repo, 'assets', 'store-description.txt')],
  ['installation-guide.md', path.join(repo, 'assets', 'installation-guide.md')],
];

const riskyPatterns = [
  /小红书发布工具/g,
  /自动发布/g,
  /批量发布/g,
  /发布助手/g,
  /高频发布者/g,
];

const requiredSafeTokens = [
  ['manifest brand', 'manifest.json', '红薯创作助手'],
  ['popup brand', 'popup.html', '红薯创作助手'],
  ['restore pill brand', 'content.js', '红薯创作助手'],
];

const failures = [];
const contents = new Map(files.map(([name, file]) => [name, fs.readFileSync(file, 'utf8')]));

for (const [name, source] of contents) {
  for (const pattern of riskyPatterns) {
    const matches = source.match(pattern);
    if (matches) failures.push(`${name} contains risky copy "${pattern.source}" (${matches.length})`);
  }
}

for (const [label, name, token] of requiredSafeTokens) {
  if (!contents.get(name)?.includes(token)) failures.push(`${label} missing "${token}"`);
}

if (failures.length) {
  console.error('Platform-safe copy check failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Platform-safe copy is clean.');
