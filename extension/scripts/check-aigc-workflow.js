#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'content', 'styles.css'), 'utf8');
const clientPath = path.join(root, 'lib', 'newapi-client.js');
const client = fs.existsSync(clientPath) ? fs.readFileSync(clientPath, 'utf8') : '';

const checks = [
  ['manifest loads NewAPI client', manifest, '"lib/newapi-client.js"'],
  ['client exposes XhsNewApiClient', client, 'global.XhsNewApiClient'],
  ['client stores local NewAPI settings', client, 'xhs_fmt_newapi_settings'],
  ['client calls chat completions', client, '/v1/chat/completions'],
  ['toolbar has rewrite entry', content, 'openRewritePanel'],
  ['rewrite panel can apply AI result', content, 'applyRewriteResult'],
  ['rewrite panel can save NewAPI settings', content, 'saveNewApiSettings'],
  ['cover panel supports logo upload', content, 'xhs-fmt-cover-logo-file'],
  ['cover panel supports sticker text', content, 'xhs-fmt-cover-sticker'],
  ['cover panel composes user elements locally', content, 'composeCoverElements'],
  ['styles include rewrite panel', styles, '.xhs-fmt-rewrite-grid'],
  ['styles include cover element row', styles, '.xhs-fmt-cover-elements'],
];

const missing = checks.filter(([, source, token]) => !source.includes(token));

if (missing.length) {
  console.error('AIGC workflow check failed:');
  for (const [name, , token] of missing) {
    console.error(`- ${name}: missing "${token}"`);
  }
  process.exit(1);
}

console.log('AIGC workflow surface is present.');
