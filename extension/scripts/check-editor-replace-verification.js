#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib', 'editor-utils.js'), 'utf8');

const sandbox = {
  window: {},
  console,
  NodeFilter: { SHOW_TEXT: 4 },
};
sandbox.self = sandbox.window;

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'editor-utils.js' });

const utils = sandbox.window.XhsEditorUtils;
if (!utils?.verifyContent) {
  console.error('XhsEditorUtils.verifyContent is not exported');
  process.exit(1);
}

const original = '原始正文第一句。原始正文第二句。';
const formatted = '✨ 排版后的开头\n\n➡️ Step1 排版后的正文\n\n#测试';
const appended = original + formatted;

const exactEditor = { tagName: 'DIV', innerText: formatted };
const appendedEditor = { tagName: 'DIV', innerText: appended };

if (!utils.verifyContent(exactEditor, formatted)) {
  console.error('Exact replacement should verify as successful');
  process.exit(1);
}

if (utils.verifyContent(appendedEditor, formatted)) {
  console.error('Appended content must not verify as successful replacement');
  process.exit(1);
}

console.log('Editor replacement verification rejects appended duplicate content.');
