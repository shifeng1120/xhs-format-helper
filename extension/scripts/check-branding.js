#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const repo = path.join(root, '..');
const files = {
  manifest: fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'),
  popupHtml: fs.readFileSync(path.join(root, 'popup', 'popup.html'), 'utf8'),
  contentJs: fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8'),
  background: fs.readFileSync(path.join(root, 'background', 'service-worker.js'), 'utf8'),
  readme: fs.readFileSync(path.join(repo, 'README.md'), 'utf8'),
  store: fs.readFileSync(path.join(repo, 'assets', 'store-description.txt'), 'utf8'),
  install: fs.readFileSync(path.join(repo, 'assets', 'installation-guide.md'), 'utf8'),
};

const required = [
  ['manifest name', files.manifest, '红薯创作助手'],
  ['manifest description', files.manifest, '小红书创作页里的本地内容增强工具'],
  ['action title', files.manifest, '红薯创作助手'],
  ['popup title', files.popupHtml, '红薯创作助手'],
  ['restore pill', files.contentJs, '红薯创作助手'],
  ['background log', files.background, '[红薯创作助手]'],
  ['README title', files.readme, '红薯创作助手'],
  ['store title', files.store, '红薯创作助手'],
  ['install guide title', files.install, '红薯创作助手'],
];

const missing = required.filter(([, source, token]) => !source.includes(token));

if (missing.length) {
  console.error('Branding check failed:');
  for (const [name, , token] of missing) {
    console.error(`- ${name}: missing "${token}"`);
  }
  process.exit(1);
}

console.log('Branding copy is consistent.');
