#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  serviceWorker: fs.readFileSync(path.join(root, 'background', 'service-worker.js'), 'utf8'),
  popupHtml: fs.readFileSync(path.join(root, 'popup', 'popup.html'), 'utf8'),
  contentJs: fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8'),
};

const checks = [
  ['service-worker.js sets 7-day trial', files.serviceWorker, 'const TRIAL_DAYS = 7'],
  ['service-worker.js install log mentions 7 days', files.serviceWorker, '7天试用期开始'],
  ['popup.html mentions 7-day trial', files.popupHtml, '7天免费试用'],
  ['popup.html shows Pro monthly price', files.popupHtml, '¥9.9'],
  ['popup.html shows annual price', files.popupHtml, '年付 ¥68'],
  ['popup.html shows lifetime early-bird price', files.popupHtml, '早鸟终身 ¥129'],
  ['popup.html shows operator plan price', files.popupHtml, '运营版 ¥29/月'],
  ['content.js modal mentions 7-day trial', files.contentJs, '7天免费试用'],
  ['content.js modal shows Pro monthly price', files.contentJs, '¥9.9/月'],
  ['content.js modal shows annual price', files.contentJs, '年付 ¥68'],
  ['content.js modal shows operator plan price', files.contentJs, '运营版 ¥29/月'],
];

const missing = checks.filter(([, source, token]) => !source.includes(token));

if (missing.length) {
  console.error('Pricing check failed:');
  for (const [name, , token] of missing) {
    console.error(`- ${name}: missing "${token}"`);
  }
  process.exit(1);
}

console.log('Pricing and trial copy are consistent.');
