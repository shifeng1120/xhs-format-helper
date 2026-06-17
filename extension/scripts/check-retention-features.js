#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'content', 'styles.css'), 'utf8');
const workspacePath = path.join(root, 'lib', 'workspace.js');
const workspace = fs.existsSync(workspacePath) ? fs.readFileSync(workspacePath, 'utf8') : '';

const checks = [
  ['manifest loads workspace module', manifest, '"lib/workspace.js"'],
  ['workspace exposes XhsWorkspace', workspace, 'global.XhsWorkspace'],
  ['workspace stores account styles', workspace, 'xhs_fmt_account_styles'],
  ['workspace stores local drafts', workspace, 'xhs_fmt_local_drafts'],
  ['toolbar has mobile preview entry', content, 'openMobilePreviewPanel'],
  ['toolbar has account style entry', content, 'openAccountStylePanel'],
  ['toolbar has local drafts entry', content, 'openLocalDraftsPanel'],
  ['content can save current draft', content, 'saveCurrentDraft'],
  ['styles include preview shell', styles, '.xhs-fmt-phone-preview'],
  ['styles include account style form', styles, '.xhs-fmt-style-form'],
  ['styles include drafts list', styles, '.xhs-fmt-draft-list'],
];

const missing = checks.filter(([, source, token]) => !source.includes(token));

if (missing.length) {
  console.error('Retention feature check failed:');
  for (const [name, , token] of missing) {
    console.error(`- ${name}: missing "${token}"`);
  }
  process.exit(1);
}

console.log('Retention feature surface is present.');
