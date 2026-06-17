#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content', 'content.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'content', 'styles.css'), 'utf8');

const failures = [];

if (/insertBefore\(toolbar,\s*editor\)/.test(content)) {
  failures.push('toolbar is inserted into the editor flow and can cover native publishing controls');
}

if (!content.includes('DEFAULT_TOOLBAR_COLLAPSED_KEY')) {
  failures.push('content.js should persist default collapsed toolbar behavior');
}

if (!content.includes('state.toolbarCollapsed = true;')) {
  failures.push('toolbar should default to collapsed on every creator page load');
}

if (content.includes('saveLocalStorage(CONFIG.DEFAULT_TOOLBAR_COLLAPSED_KEY, false)')) {
  failures.push('expanded toolbar state should not persist across page loads');
}

if (!styles.includes('.xhs-fmt-toolbar-dock')) {
  failures.push('styles.css missing floating dock layout for expanded toolbar');
}

if (!styles.includes('bottom: 72px')) {
  failures.push('floating toolbar should leave room for native bottom action bars');
}

if (!/\.xhs-fmt-restore-pill[\s\S]*bottom:\s*(8[8-9]|9\d|1\d{2})px/.test(styles)) {
  failures.push('restore pill should sit above native bottom action bars');
}

if (failures.length) {
  console.error('Nonblocking toolbar check failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Toolbar no longer blocks native publishing controls.');
