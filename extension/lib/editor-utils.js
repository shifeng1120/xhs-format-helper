// ============================================
// 小红书排版助手 - 编辑器工具 v2.6
// 针对 Tiptap/ProseMirror 深度适配
// ============================================

(function (global) {
  'use strict';

  let lastSavedRange = null;
  let lastSavedText = '';
  let lastTextareaSelection = null;

  const SKIP_SEL = '#xhs-fmt-toolbar, .xhs-fmt-panel, #xhs-fmt-float-btn, .xhs-fmt-gen-modal-overlay, .xhs-fmt-format-modal';

  function initSelectionSaver() {
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const t = sel.toString();
      if (!t) return;

      const editor = findEditorFromSelection() || findEditor();
      if (editor?.tagName === 'TEXTAREA') {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        if (end > start) {
          lastTextareaSelection = { start, end, editor };
          lastSavedText = editor.value.slice(start, end);
        }
        return;
      }

      if (editor) {
        const range = sel.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          lastSavedRange = range.cloneRange();
          lastSavedText = t;
        }
      } else if (t.length > 10) {
        lastSavedText = t;
        lastSavedRange = sel.getRangeAt(0).cloneRange();
      }
    });
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0.05;
  }

  function queryDeep(selector, root) {
    const results = [];
    const seen = new Set();
    function walk(node) {
      if (!node) return;
      try {
        node.querySelectorAll?.(selector)?.forEach((el) => {
          if (!seen.has(el)) { seen.add(el); results.push(el); }
        });
      } catch (e) { /* ignore */ }
      if (node.shadowRoot) walk(node.shadowRoot);
      node.children && [...node.children].forEach((c) => walk(c));
    }
    walk(root || document.body);
    document.querySelectorAll('iframe').forEach((frame) => {
      try {
        if (frame.contentDocument?.body) walk(frame.contentDocument.body);
      } catch (e) { /* cross-origin */ }
    });
    return results;
  }

  function fieldHint(el) {
    return ((el.placeholder || '') + (el.getAttribute('aria-label') || '') + (el.className || '') +
      (el.getAttribute('data-placeholder') || '') + (el.id || '')).toLowerCase();
  }

  function isTitleField(el) {
    const hint = fieldHint(el);
    if (/正文|描述|内容|摘录|笔记正文|说点什么|添加正文/.test(hint)) return false;
    return /标题|title|笔记标题|填写标题/.test(hint);
  }

  function isBodyField(el) {
    const hint = fieldHint(el);
    return /正文|描述|内容|摘录|说点什么|添加正文|笔记|editor|tiptap|prosemirror|补充|说说/.test(hint);
  }

  function isEditable(el) {
    if (!el || el.closest(SKIP_SEL)) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT' && (el.type === 'text' || !el.type)) return false;
    const ce = el.getAttribute?.('contenteditable');
    return ce != null && ce !== 'false';
  }

  function findProseMirrorEditors() {
    const selectors = [
      '.ProseMirror',
      '.tiptap',
      '[class*="ProseMirror"]',
      '[class*="tiptap"]',
      '[class*="editor-content"]',
      '[class*="note-content"]',
      '[data-slate-editor]',
      'div[contenteditable]',
      'p[contenteditable]',
      '[role="textbox"]',
    ].join(', ');
    return queryDeep(selectors)
      .filter((el) => isEditable(el) && isVisible(el) && !isTitleField(el));
  }

  function findEditorFromSelection() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return null;
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const hit = el?.closest?.('.ProseMirror, .tiptap, [contenteditable], textarea, [role="textbox"]');
    if (hit && !hit.closest(SKIP_SEL) && !isTitleField(hit)) return hit;

    const active = document.activeElement;
    if (active && !active.closest(SKIP_SEL) && !isTitleField(active)) {
      if (active.matches?.('.ProseMirror, .tiptap, [contenteditable], textarea')) return active;
      if (active.getAttribute?.('contenteditable') != null) return active;
    }
    return null;
  }

  function scoreEditor(el) {
    let score = 0;
    const rect = el.getBoundingClientRect();
    const textLen = getEditorTextRobust(el).length;
    const hint = ((el.className || '') + (el.placeholder || '')).toLowerCase();

    score += Math.min(rect.width, 900) / 8;
    score += Math.min(rect.height, 500) / 4;
    score += Math.min(textLen, 8000) / 3;

    if (el.classList?.contains('ProseMirror') || hint.includes('tiptap')) score += 500;
    if (isBodyField(el)) score += 300;
    if (isTitleField(el)) score -= 400;
    if (el.tagName === 'TEXTAREA' && rect.height > 40) score += 150;
    if (isEditable(el) && el.tagName !== 'TEXTAREA') score += 120;
    if (rect.width > 280 && rect.height > 36) score += 60;

    return score;
  }

  function findEditor() {
    const active = document.activeElement;
    if (active && !active.closest(SKIP_SEL) && !isTitleField(active) && isEditable(active) && isVisible(active)) {
      return active;
    }

    const fromSel = findEditorFromSelection();
    if (fromSel) return fromSel;

    const candidates = [];
    findProseMirrorEditors().forEach((el) => candidates.push(el));
    queryDeep('textarea, input[type="text"]').forEach((el) => {
      if (!el.closest(SKIP_SEL) && isVisible(el) && !isTitleField(el)) candidates.push(el);
    });

    const unique = [...new Set(candidates)];
    unique.sort((a, b) => scoreEditor(b) - scoreEditor(a));
    return unique[0] || null;
  }

  async function waitForEditor(timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 6000);
    while (Date.now() < deadline) {
      const ed = findEditor();
      if (ed) return ed;
      await sleep(350);
    }
    return findEditor();
  }

  function getEditorTextRobust(editor) {
    if (!editor) return '';
    if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') return editor.value || '';

    const parts = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.textContent) parts.push(n.textContent);
    }
    const joined = parts.join('');
    if (joined.trim()) return joined;

    return editor.innerText || editor.textContent || '';
  }

  function captureFormatContext() {
    const sel = window.getSelection();
    let selectedText = sel?.toString() || '';

    if (!selectedText && lastSavedText) selectedText = lastSavedText;

    const editor = findEditorFromSelection() || findEditor();
    const fullText = editor ? getEditorTextRobust(editor).trim() : '';

    let textareaSel = null;
    if (editor?.tagName === 'TEXTAREA') {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      if (end > start) {
        selectedText = selectedText || editor.value.slice(start, end);
        textareaSel = { start, end };
      } else if (lastTextareaSelection?.editor === editor) {
        selectedText = selectedText || editor.value.slice(lastTextareaSelection.start, lastTextareaSelection.end);
        textareaSel = { ...lastTextareaSelection };
      }
    }

    const sourceText = (selectedText.trim() || fullText).trim();
    const replaceAll = !selectedText.trim() || selectedText.length >= Math.max(fullText.length * 0.8, 50);

    return {
      editor,
      sourceText,
      replaceAll,
      range: replaceAll ? null : (lastSavedRange || (sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null)),
      textareaSel: replaceAll ? null : textareaSel,
      isSelection: !!selectedText.trim() && !replaceAll,
    };
  }

  function verifyContent(editor, expected) {
    const actual = getEditorTextRobust(editor).trim();
    const exp = (expected || '').trim();
    if (!exp) return false;
    if (actual === exp) return true;
    if (actual.length >= exp.length * 0.7) return true;
    const head = exp.slice(0, Math.min(30, exp.length));
    return head.length > 5 && actual.includes(head);
  }

  function triggerInput(el, value) {
    const data = value != null ? value : '';
    try {
      el.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true, cancelable: true, inputType: 'insertReplacementText', data,
      }));
    } catch (e) { /* ignore */ }
    el.dispatchEvent(new InputEvent('input', {
      bubbles: true, cancelable: true, inputType: 'insertReplacementText', data,
    }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a', code: 'KeyA' }));
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(el, value);
      triggerInput(el, value);
      return true;
    }
    el.value = value;
    triggerInput(el, value);
    return true;
  }

  function selectAllInEditor(editor) {
    editor.focus();
    try { editor.click(); } catch (e) { /* ignore */ }

    if (editor.tagName === 'TEXTAREA') {
      editor.selectionStart = 0;
      editor.selectionEnd = editor.value.length;
      return;
    }

    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  async function replaceViaClipboard(editor, text) {
    try {
      await navigator.clipboard.writeText(text);
      selectAllInEditor(editor);
      await sleep(80);

      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const evt = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
        editor.dispatchEvent(evt);
        await sleep(120);
        if (verifyContent(editor, text)) return true;
      } catch (e) { /* ignore */ }

      const ok = document.execCommand('paste');
      await sleep(120);
      if (ok && verifyContent(editor, text)) return true;
    } catch (e) {
      console.warn('[排版助手] 剪贴板粘贴失败:', e);
    }
    return false;
  }

  function setProseMirrorContent(editor, text) {
    selectAllInEditor(editor);
    document.execCommand('delete', false, null);

    if (document.execCommand('insertText', false, text)) {
      triggerInput(editor, text);
      if (verifyContent(editor, text)) return true;
    }

    const lines = text.split('\n');
    const html = lines.map((line) => {
      if (!line.trim()) return '<p><br></p>';
      return `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`;
    }).join('');
    editor.innerHTML = html;
    triggerInput(editor, text);
    if (verifyContent(editor, text)) return true;

    editor.textContent = text;
    triggerInput(editor, text);
    return verifyContent(editor, text);
  }

  function setTextareaContent(editor, text, textareaSel) {
    if (textareaSel?.start != null && textareaSel.end > textareaSel.start) {
      const val = editor.value;
      const next = val.slice(0, textareaSel.start) + text + val.slice(textareaSel.end);
      return setNativeValue(editor, next) && verifyContent(editor, text);
    }
    return setNativeValue(editor, text) && verifyContent(editor, text);
  }

  async function replaceEditorContent(editor, plainText, options) {
    if (!editor || plainText == null) return false;
    const opts = options || {};
    const text = String(plainText);
    const replaceAll = opts.replaceAll !== false;

    editor.focus();

    if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
      return setTextareaContent(editor, text, replaceAll ? null : opts.textareaSel);
    }

    if (!replaceAll && opts.savedRange && !opts.savedRange.collapsed) {
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(opts.savedRange);
        opts.savedRange.deleteContents();
        opts.savedRange.insertNode(document.createTextNode(text));
        triggerInput(editor, text);
        if (verifyContent(editor, text)) return true;
      } catch (e) { /* fall through */ }
    }

    if (await replaceViaClipboard(editor, text)) return true;
    if (setProseMirrorContent(editor, text)) return true;

    selectAllInEditor(editor);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);
    triggerInput(editor, text);

    return verifyContent(editor, text);
  }

  function getEditorText(editor) {
    return getEditorTextRobust(editor).trim();
  }

  function getSelectedText(editor) {
    const cap = captureFormatContext();
    return {
      text: cap.isSelection ? cap.sourceText : '',
      range: cap.range,
      hasSelection: cap.isSelection,
      replaceAll: cap.replaceAll,
      sourceText: cap.sourceText,
    };
  }

  const UPLOAD_TRIGGER_RE = /上传图片|添加图片|添加图文|上传图文|上传照片|选择图片|点击上传|拖拽上传|从相册|继续添加|\+添加|添加笔记图片|点击添加/;

  function findAllFileInputs() {
    const inputs = queryDeep('input[type="file"]');
    const imageInputs = inputs.filter((inp) => {
      const accept = (inp.accept || '').toLowerCase();
      return accept.includes('image') || accept.includes('jpg') || accept.includes('png');
    });
    if (imageInputs.length) return imageInputs;
    return inputs.filter((inp) => {
      const accept = (inp.accept || '').toLowerCase();
      return !accept || accept.includes('*');
    });
  }

  function clickUploadTriggers() {
    const clicked = new Set();
    queryDeep('button, div, span, label, a, [role="button"], [class*="upload"]').forEach((el) => {
      if (!isVisible(el) || clicked.has(el)) return;
      const t = (el.textContent || '').trim();
      const aria = el.getAttribute('aria-label') || '';
      if ((UPLOAD_TRIGGER_RE.test(t) || UPLOAD_TRIGGER_RE.test(aria)) && t.length < 40) {
        try { el.click(); clicked.add(el); } catch (e) { /* ignore */ }
      }
    });
    queryDeep('label[for]').forEach((label) => {
      const forId = label.getAttribute('for');
      const input = document.getElementById(forId);
      if (input?.type === 'file' && isVisible(label)) {
        try { label.click(); } catch (e) { /* ignore */ }
      }
    });
  }

  function findDropZones() {
    return queryDeep('[class*="upload"], [class*="uploader"], [class*="drag"], [class*="drop"]').filter(isVisible);
  }

  function waitForFileInput(timeoutMs) {
    return new Promise((resolve) => {
      clickUploadTriggers();
      const deadline = Date.now() + (timeoutMs || 5000);
      const tick = () => {
        const inputs = findAllFileInputs();
        const visible = inputs.find((inp) => inp.offsetParent !== null || inp.getClientRects().length > 0);
        const input = visible || inputs[0];
        if (input || Date.now() > deadline) resolve(input || null);
        else setTimeout(tick, 200);
      };
      tick();
    });
  }

  async function dropFileOnZone(zone, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    const opts = { bubbles: true, cancelable: true, dataTransfer: dt };
    zone.dispatchEvent(new DragEvent('dragenter', opts));
    zone.dispatchEvent(new DragEvent('dragover', opts));
    zone.dispatchEvent(new DragEvent('drop', opts));
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  global.XhsEditorUtils = {
    initSelectionSaver,
    findEditor,
    findEditorFromSelection,
    captureFormatContext,
    getEditorTextRobust,
    replaceEditorContent,
    replaceViaClipboard,
    getEditorText,
    getSelectedText,
    verifyContent,
    waitForEditor,
    waitForFileInput,
    findAllFileInputs,
    findDropZones,
    dropFileOnZone,
    clickUploadTriggers,
    triggerInput,
    sleep,
    queryDeep,
    isVisible,
  };
})(typeof window !== 'undefined' ? window : self);
