// ============================================
// 小红书排版助手 - 内容注入脚本 v1.1.0
// ============================================

(function () {
  'use strict';

  // ---------- 配置 ----------
  const CONFIG = {
    STORAGE_KEY: 'xhs_fmt_settings',
    PRO_KEY: 'xhs_fmt_pro_key',
    PRO_KEY_PREFIX: 'XHS-PRO-',
    TOOLBAR_ID: 'xhs-fmt-toolbar',
    DEBOUNCE_MS: 300,
    OBSERVER_INTERVAL: 2000,
  };

  // ---------- 状态 ----------
  let state = {
    isPro: false,
    proSource: 'none', // 'activation' | 'trial' | 'expired' | 'none'
    toolbarInjected: false,
    currentSelection: null,
    activePanel: null, // 当前打开的面板
  };

  // ---------- 工具函数 ----------

  async function loadStorage(key) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(key, (result) => resolve(result[key]));
      } else {
        resolve(localStorage.getItem(key));
      }
    });
  }

  async function saveStorage(key, value) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set({ [key]: value }, resolve);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      }
    });
  }

  function isValidProKey(key) {
    if (!key || typeof key !== 'string') return false;
    return key.startsWith(CONFIG.PRO_KEY_PREFIX) && key.length >= 16;
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /** 生成唯一 ID */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ---------- Pro / 试用状态 ----------

  async function initProStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'isPro' }, (result) => {
        if (result) {
          state.isPro = result.isPro;
          state.proSource = result.source || 'none';
        }
        resolve(state.isPro);
      });
    });
  }

  // ---------- 检测编辑器 DOM ----------

  function findEditor() {
    const editors = document.querySelectorAll('[contenteditable="true"]');
    for (const el of editors) {
      if (el.offsetWidth > 200 && el.offsetHeight > 100) {
        return el;
      }
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const node = sel.getRangeAt(0).commonAncestorContainer;
      const editable = node.closest?.('[contenteditable="true"]');
      if (editable) return editable;
    }
    return null;
  }

  // ---------- 注入工具栏 ----------

  function injectToolbar() {
    if (state.toolbarInjected) return;
    const editor = findEditor();
    if (!editor) return;

    const toolbar = createToolbarElement();
    if (!toolbar) return;

    editor.parentNode.insertBefore(toolbar, editor);
    state.toolbarInjected = true;
    console.log('[小红书排版助手] 工具栏已注入');
  }

  /** 创建工具栏 DOM */
  function createToolbarElement() {
    if (document.getElementById(CONFIG.TOOLBAR_ID)) return null;

    const toolbar = document.createElement('div');
    toolbar.id = CONFIG.TOOLBAR_ID;

    // ---- 字号 ----
    toolbar.appendChild(createLabel('字号'));
    toolbar.appendChild(createSelect(
      ['14', '15', '16', '17', '18', '20', '22', '24'],
      ['14', '15', '16', '17', '18', '20', '22', '24'],
      '16',
      (val) => execFormat('fontSize', val)
    ));
    toolbar.appendChild(createDivider());

    // ---- 行距 ----
    toolbar.appendChild(createLabel('行距'));
    toolbar.appendChild(createSelect(
      ['1.0', '1.5', '1.75', '2.0', '2.5'],
      ['1.0', '1.5', '1.75', '2.0', '2.5'],
      '1.75',
      (val) => applyLineHeight(val)
    ));
    toolbar.appendChild(createDivider());

    // ---- 颜色 ----
    toolbar.appendChild(createLabel('颜色'));
    toolbar.appendChild(createColorPicker('foreColor', '#333333'));
    toolbar.appendChild(createPresetColors([
      '#333333', '#ff4757', '#ff6348', '#ffa502',
      '#2ed573', '#1e90ff', '#a855f7', '#000000'
    ], 'foreColor'));
    toolbar.appendChild(createDivider());

    // ---- 加粗/斜体/下划线 ----
    toolbar.appendChild(createToggleBtn('B', '加粗', () => execFormat('bold')));
    toolbar.appendChild(createToggleBtn('I', '斜体', () => execFormat('italic')));
    toolbar.appendChild(createToggleBtn('U', '下划线', () => execFormat('underline')));
    toolbar.appendChild(createDivider());

    // ---- 对齐 ----
    toolbar.appendChild(createBtn('⬅', '左对齐', () => execFormat('justifyLeft')));
    toolbar.appendChild(createBtn('⬇', '居中对齐', () => execFormat('justifyCenter')));
    toolbar.appendChild(createBtn('➡', '右对齐', () => execFormat('justifyRight')));
    toolbar.appendChild(createDivider());

    // ---- 缩进 ----
    toolbar.appendChild(createBtn('↔', '减少缩进', () => execFormat('outdent')));
    toolbar.appendChild(createBtn('→', '增加缩进', () => execFormat('indent')));
    toolbar.appendChild(createDivider());

    // ---- Pro 功能（试用/Pro 可解锁） ----
    if (state.isPro) {
      // 完全解锁：直接使用功能
      toolbar.appendChild(createBtnText('📋 模板', () => openTemplatePanel()));
      toolbar.appendChild(createBtnText('🎨 配色', () => openColorSchemePanel()));
      toolbar.appendChild(createBtnText('🧹 清理', () => runFormatCleaner()));
      toolbar.appendChild(createBtnText('🏷️ 标签', () => openHashtagPanel()));
    } else if (state.proSource === 'expired') {
      // 试用过期：全部锁定，点购买
      toolbar.appendChild(createLockedBtn('📋 模板', '试用已过期'));
      toolbar.appendChild(createLockedBtn('🎨 配色', '试用已过期'));
      toolbar.appendChild(createLockedBtn('🧹 清理', '试用已过期'));
      toolbar.appendChild(createLockedBtn('🏷️ 标签', '试用已过期'));
    }

    // ---- 升级入口（非激活用户显示） ----
    if (state.proSource !== 'activation') {
      toolbar.appendChild(createDivider());
      const upgradeBtn = document.createElement('button');
      upgradeBtn.className = 'xhs-fmt-btn-text xhs-fmt-btn-upgrade';
      upgradeBtn.textContent = state.proSource === 'trial' ? '⭐ 试用中·升级永久' : '⭐ 升级Pro';
      upgradeBtn.title = '解锁全部高级功能';
      upgradeBtn.addEventListener('click', showProModal);
      toolbar.appendChild(upgradeBtn);
    }

    return toolbar;
  }

  // ---------- DOM 辅助函数 ----------

  function createLabel(text) {
    const span = document.createElement('span');
    span.className = 'xhs-fmt-label';
    span.textContent = text;
    return span;
  }

  function createDivider() {
    const div = document.createElement('span');
    div.className = 'xhs-fmt-divider';
    return div;
  }

  function createBtn(text, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'xhs-fmt-btn';
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function createToggleBtn(text, title, onToggle) {
    const btn = createBtn(text, title, () => {
      onToggle();
      btn.classList.toggle('active');
    });
    return btn;
  }

  function createBtnText(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'xhs-fmt-btn-text';
    btn.textContent = text;
    btn.title = text;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  /** 锁定按钮（已过期） */
  function createLockedBtn(text, reason) {
    const btn = document.createElement('button');
    btn.className = 'xhs-fmt-btn-text xhs-fmt-btn-pro';
    btn.textContent = text;
    btn.title = reason;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showProModal();
    });
    return btn;
  }

  function createSelect(values, labels, defaultValue, onChange) {
    const select = document.createElement('select');
    select.className = 'xhs-fmt-select';
    values.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labels[i] || v;
      if (v === defaultValue) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(e.target.value);
    });
    return select;
  }

  function createColorPicker(command, defaultValue) {
    const wrapper = document.createElement('span');
    wrapper.className = 'xhs-fmt-color-wrapper';
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'xhs-fmt-color';
    input.value = defaultValue;
    input.title = '自定义颜色';
    input.addEventListener('input', (e) => {
      e.preventDefault();
      e.stopPropagation();
      execFormat(command, e.target.value);
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function createPresetColors(colors, command) {
    const wrapper = document.createElement('span');
    wrapper.className = 'xhs-fmt-preset-colors';
    colors.forEach((color) => {
      const dot = document.createElement('span');
      dot.className = 'xhs-fmt-preset-color';
      dot.style.backgroundColor = color;
      dot.title = color;
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        execFormat(command, color);
        wrapper.querySelectorAll('.xhs-fmt-preset-color').forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');
      });
      wrapper.appendChild(dot);
    });
    return wrapper;
  }

  // ---------- 排版命令执行 ----------

  function execFormat(command, value) {
    const editor = findEditor();
    if (!editor) return;

    editor.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    try {
      if (value !== undefined) {
        document.execCommand(command, false, value);
      } else {
        document.execCommand(command, false, null);
      }
    } catch (e) {
      console.warn('[小红书排版助手] execCommand 失败:', command, e);
    }

    editor.focus();
  }

  function applyLineHeight(value) {
    const editor = findEditor();
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    let container = range.commonAncestorContainer;

    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    let block = container;
    while (block && block !== editor) {
      const display = window.getComputedStyle(block).display;
      if (display === 'block' || display === 'div' || display === 'p') {
        block.style.lineHeight = value;
        return;
      }
      block = block.parentElement;
    }

    try {
      document.execCommand('insertHTML', false, `<span style="line-height:${value}">${range.toString()}</span>`);
    } catch (e) {
      console.warn('[小红书排版助手] 行距设置失败:', e);
    }

    editor.focus();
  }

  // =============================================
  // Pro 功能实现
  // =============================================

  // ---------- 模板选择面板 ----------

  const TEMPLATES = [
    { id: 'clean', name: '清新简约', emoji: '🌿', desc: '干净利落，适合日常分享', style: { fontSize: '16px', lineHeight: '1.75', color: '#333333', textAlign: 'left' } },
    { id: 'business', name: '干练商务', emoji: '💼', desc: '专业正式，适合职场分享', style: { fontSize: '15px', lineHeight: '1.5', color: '#222222', textAlign: 'left' } },
    { id: 'cute', name: '可爱清新', emoji: '🌸', desc: '甜美可爱，适合美妆穿搭', style: { fontSize: '16px', lineHeight: '2.0', color: '#555555', textAlign: 'center' } },
    { id: 'minimal', name: '极简留白', emoji: '◻️', desc: '大量留白，适合摄影感悟', style: { fontSize: '17px', lineHeight: '2.5', color: '#444444', textAlign: 'left' } },
    { id: 'vintage', name: '复古文艺', emoji: '📜', desc: '复古色调，适合书评影评', style: { fontSize: '16px', lineHeight: '1.8', color: '#5D4037', textAlign: 'left' } },
  ];

  function openTemplatePanel() {
    closeActivePanel();
    const editor = findEditor();
    if (!editor) return;

    const panel = document.createElement('div');
    panel.className = 'xhs-fmt-panel';
    panel.id = 'xhs-fmt-panel-' + uid();

    // 标题
    const header = document.createElement('div');
    header.className = 'xhs-fmt-panel-header';
    header.innerHTML = '<span>📋 选择排版模板</span><span class="xhs-fmt-panel-close">✕</span>';
    header.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => panel.remove());
    panel.appendChild(header);

    // 模板卡片
    const grid = document.createElement('div');
    grid.className = 'xhs-fmt-panel-grid';

    TEMPLATES.forEach((tpl) => {
      const card = document.createElement('div');
      card.className = 'xhs-fmt-template-card';
      card.innerHTML = `
        <div class="xhs-fmt-template-preview" style="font-size:${tpl.style.fontSize}; line-height:${tpl.style.lineHeight}; color:${tpl.style.color}; text-align:${tpl.style.textAlign};">
          <span class="xhs-fmt-template-emoji">${tpl.emoji}</span>
          <div class="xhs-fmt-template-sample" style="font-size:${tpl.style.fontSize}; color:${tpl.style.color};">
            排版预览
          </div>
        </div>
        <div class="xhs-fmt-template-name">${tpl.name}</div>
        <div class="xhs-fmt-template-desc">${tpl.desc}</div>
      `;
      card.addEventListener('click', () => {
        applyTemplateToEditor(tpl, editor);
        panel.remove();
      });
      grid.appendChild(card);
    });

    panel.appendChild(grid);
    editor.parentNode.insertBefore(panel, editor.nextSibling);
    state.activePanel = panel;
  }

  function applyTemplateToEditor(tpl, editor) {
    const paragraphs = editor.querySelectorAll('p, div[style*="margin"], [data-block]');
    if (paragraphs.length === 0) {
      editor.style.fontSize = tpl.style.fontSize;
      editor.style.lineHeight = tpl.style.lineHeight;
      editor.style.color = tpl.style.color;
      editor.style.textAlign = tpl.style.textAlign;
    } else {
      paragraphs.forEach((p) => {
        p.style.fontSize = tpl.style.fontSize;
        p.style.lineHeight = tpl.style.lineHeight;
        p.style.color = tpl.style.color;
        p.style.textAlign = tpl.style.textAlign;
      });
    }
  }

  // ---------- 配色方案面板 ----------

  const COLOR_SCHEMES = [
    { id: 'default', name: '经典黑白', primary: '#333333', accent: '#1976D2', bg: '#FFFFFF' },
    { id: 'rose', name: '玫瑰红茶', primary: '#5D4037', accent: '#E91E63', bg: '#FFF8F0' },
    { id: 'ocean', name: '深海蓝调', primary: '#1A237E', accent: '#00BCD4', bg: '#E8EAF6' },
    { id: 'forest', name: '森林物语', primary: '#1B5E20', accent: '#FF9800', bg: '#F1F8E9' },
    { id: 'sunset', name: '日落余晖', primary: '#E65100', accent: '#FFD54F', bg: '#FFF3E0' },
    { id: 'lavender', name: '薰衣草田', primary: '#4A148C', accent: '#CE93D8', bg: '#F3E5F5' },
    { id: 'matcha', name: '抹茶拿铁', primary: '#33691E', accent: '#FFAB91', bg: '#F1F8E9' },
    { id: 'chocolate', name: '巧克力慕斯', primary: '#3E2723', accent: '#FFB300', bg: '#FFF8E1' },
    { id: 'sky', name: '天空之城', primary: '#01579B', accent: '#FF4081', bg: '#E1F5FE' },
    { id: 'mono', name: '高级灰调', primary: '#212121', accent: '#9E9E9E', bg: '#F5F5F5' },
  ];

  function openColorSchemePanel() {
    closeActivePanel();
    const editor = findEditor();
    if (!editor) return;

    const panel = document.createElement('div');
    panel.className = 'xhs-fmt-panel';
    panel.id = 'xhs-fmt-panel-' + uid();

    const header = document.createElement('div');
    header.className = 'xhs-fmt-panel-header';
    header.innerHTML = '<span>🎨 选择配色方案</span><span class="xhs-fmt-panel-close">✕</span>';
    header.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => panel.remove());
    panel.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'xhs-fmt-panel-grid xhs-fmt-scheme-grid';

    COLOR_SCHEMES.forEach((scheme) => {
      const card = document.createElement('div');
      card.className = 'xhs-fmt-scheme-card';
      card.innerHTML = `
        <div class="xhs-fmt-scheme-preview" style="background:${scheme.bg};">
          <span class="xhs-fmt-scheme-dot" style="background:${scheme.primary};"></span>
          <span class="xhs-fmt-scheme-dot" style="background:${scheme.accent};"></span>
        </div>
        <div class="xhs-fmt-template-name">${scheme.name}</div>
      `;
      card.addEventListener('click', () => {
        applyColorSchemeToEditor(scheme, editor);
        panel.remove();
      });
      grid.appendChild(card);
    });

    panel.appendChild(grid);
    editor.parentNode.insertBefore(panel, editor.nextSibling);
    state.activePanel = panel;
  }

  function applyColorSchemeToEditor(scheme, editor) {
    editor.focus();
    document.execCommand('foreColor', false, scheme.primary);
    editor.focus();
  }

  // ---------- 格式清理 ----------

  function runFormatCleaner() {
    const editor = findEditor();
    if (!editor) return;

    // 收集掉所有 inline 样式，清理到统一格式
    const allElements = editor.querySelectorAll('*');
    allElements.forEach((el) => {
      // 清除所有内联样式
      el.removeAttribute('style');
      // 清除字体标签
      if (el.tagName === 'FONT') {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });

    // 重置编辑器基础样式
    editor.style.cssText = '';
    editor.style.fontSize = '16px';
    editor.style.lineHeight = '1.75';
    editor.style.color = '#333333';

    // 显示成功提示
    showTooltip('🧹 格式已清理，排版已统一');
  }

  // ---------- 话题标签管理 ----------

  const COMMON_HASHTAGS = [
    '#日常分享', '#生活记录', '#好物推荐', '#穿搭分享',
    '#美妆教程', '#旅行攻略', '#美食探店', '#读书笔记',
    '#职场干货', '#学习打卡', '#健身打卡', '#Vlog日常',
    '#plog', '#OOTD', '#开箱测评', '#探店分享',
  ];

  function openHashtagPanel() {
    closeActivePanel();
    const editor = findEditor();
    if (!editor) return;

    const panel = document.createElement('div');
    panel.className = 'xhs-fmt-panel';
    panel.id = 'xhs-fmt-panel-' + uid();

    const header = document.createElement('div');
    header.className = 'xhs-fmt-panel-header';
    header.innerHTML = '<span>🏷️ 插入话题标签</span><span class="xhs-fmt-panel-close">✕</span>';
    header.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => panel.remove());
    panel.appendChild(header);

    const tagContainer = document.createElement('div');
    tagContainer.className = 'xhs-fmt-hashtag-container';

    COMMON_HASHTAGS.forEach((tag) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'xhs-fmt-hashtag';
      tagEl.textContent = tag;
      tagEl.addEventListener('click', () => {
        insertTextAtCursor(tag + ' ');
        panel.remove();
      });
      tagContainer.appendChild(tagEl);
    });

    panel.appendChild(tagContainer);

    // 自定义标签
    const customRow = document.createElement('div');
    customRow.style.cssText = 'margin-top: 12px; display: flex; gap: 8px;';
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.placeholder = '自定义标签...';
    customInput.className = 'xhs-fmt-custom-tag-input';
    const addBtn = document.createElement('button');
    addBtn.textContent = '插入';
    addBtn.className = 'xhs-fmt-custom-tag-btn';
    addBtn.addEventListener('click', () => {
      const val = customInput.value.trim();
      if (val) {
        insertTextAtCursor('#' + val + ' ');
        panel.remove();
      }
    });
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
    customRow.appendChild(customInput);
    customRow.appendChild(addBtn);
    panel.appendChild(customRow);

    editor.parentNode.insertBefore(panel, editor.nextSibling);
    state.activePanel = panel;
    customInput.focus();
  }

  function insertTextAtCursor(text) {
    const editor = findEditor();
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      // 没有选区，直接追加到编辑器末尾
      editor.appendChild(document.createTextNode(text));
      return;
    }

    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // ---------- 面板管理 ----------

  function closeActivePanel() {
    if (state.activePanel && state.activePanel.parentNode) {
      state.activePanel.remove();
    }
    state.activePanel = null;
  }

  // ---------- Tooltip 提示 ----------

  function showTooltip(text) {
    const existing = document.querySelector('.xhs-fmt-tooltip');
    if (existing) existing.remove();

    const tip = document.createElement('div');
    tip.className = 'xhs-fmt-tooltip';
    tip.textContent = text;
    document.body.appendChild(tip);

    setTimeout(() => {
      tip.classList.add('xhs-fmt-tooltip-fade');
      setTimeout(() => tip.remove(), 300);
    }, 2000);
  }

  // ---------- Pro 弹窗（仅试用过期 / 未购买） ----------

  function showProModal() {
    if (state.proSource === 'activation') return;

    if (document.getElementById('xhs-fmt-pro-modal-overlay')) return;

    let titleText = '⭐ 升级到 Pro';
    let descText = '解锁全部高级功能：排版模板、配色方案、格式清理、自定义模板、话题标签管理';

    if (state.proSource === 'trial') {
      titleText = '⭐ 试用期结束后升级';
      descText = '你的试用期即将结束，升级永久版继续享受所有高级功能';
    }

    const overlay = document.createElement('div');
    overlay.id = 'xhs-fmt-pro-modal-overlay';
    overlay.innerHTML = `
      <div id="xhs-fmt-pro-modal">
        <h2>${titleText}</h2>
        <p>${descText}</p>
        <span class="xhs-fmt-price">¥29.9 <small>终身买断</small></span>
        <button class="xhs-fmt-pro-btn-buy">立即升级 →</button>
        <br/>
        <button class="xhs-fmt-pro-btn-close">以后再说</button>
        <div style="margin-top:12px; text-align:center;">
          <span class="xhs-fmt-pro-link-activate" style="color:#1976d2; cursor:pointer; font-size:13px; font-weight:600;">🔑 已有激活码？点击输入</span>
        </div>
        <div id="xhs-fmt-activate-section" style="display:none; margin-top:12px;">
          <input type="text" id="xhs-fmt-license-input" placeholder="XHS-PRO-XXXX-XXXX-XX"
                 style="width:90%; padding:8px; border:1px solid #ddd; border-radius:6px; font-family:monospace; font-size:13px;">
          <div style="margin-top:8px;">
            <button id="xhs-fmt-btn-activate" style="background:#1976d2; color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer; font-size:13px;">激活 Pro</button>
            <button id="xhs-fmt-btn-cancel-activate" style="background:#f5f5f5; color:#666; border:1px solid #ddd; border-radius:6px; padding:8px 16px; cursor:pointer; font-size:13px; margin-left:8px;">取消</button>
          </div>
          <div id="xhs-fmt-activate-result" style="margin-top:8px; font-size:13px;"></div>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    setTimeout(() => {
      const buyBtn = overlay.querySelector('.xhs-fmt-pro-btn-buy');
      const closeBtn = overlay.querySelector('.xhs-fmt-pro-btn-close');
      const activateLink = overlay.querySelector('.xhs-fmt-pro-link-activate');
      const activateSection = overlay.querySelector('#xhs-fmt-activate-section');
      const activateBtn = overlay.querySelector('#xhs-fmt-btn-activate');
      const cancelBtn = overlay.querySelector('#xhs-fmt-btn-cancel-activate');
      const licenseInput = overlay.querySelector('#xhs-fmt-license-input');
      const resultDiv = overlay.querySelector('#xhs-fmt-activate-result');

      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          window.open('https://afdian.com/item/b4dab2045cf111f18bfd52540025c377', '_blank');
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => overlay.remove());
      }

      if (activateLink) {
        activateLink.addEventListener('click', () => {
          activateSection.style.display = 'block';
          licenseInput.focus();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          activateSection.style.display = 'none';
          licenseInput.value = '';
          resultDiv.textContent = '';
        });
      }

      if (activateBtn && licenseInput) {
        activateBtn.addEventListener('click', async () => {
          const rawKey = licenseInput.value.trim().toUpperCase();
          if (!rawKey) {
            resultDiv.textContent = '请输入激活码';
            resultDiv.style.color = '#c62828';
            return;
          }
          if (!/^XHS-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(rawKey)) {
            resultDiv.textContent = '激活码格式不正确，请检查后重试';
            resultDiv.style.color = '#c62828';
            return;
          }
          await saveStorage(CONFIG.PRO_KEY, rawKey);
          state.isPro = true;
          state.proSource = 'activation';
          resultDiv.textContent = '✅ 激活成功！所有 Pro 功能已解锁';
          resultDiv.style.color = '#2e7d32';
          activateSection.style.display = 'none';
          licenseInput.value = '';
          setTimeout(() => { overlay.remove(); injectToolbar(); }, 1500);
        });
      }
    }, 100);

    document.body.appendChild(overlay);
  }

  // ---------- MutationObserver ----------

  function startObserver() {
    const observer = new MutationObserver(
      debounce(() => {
        if (!state.toolbarInjected) {
          injectToolbar();
        }
      }, CONFIG.DEBOUNCE_MS)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    injectToolbar();
  }

  // ---------- 全局点击关闭面板 ----------

  document.addEventListener('click', (e) => {
    if (state.activePanel && !state.activePanel.contains(e.target) && !e.target.closest('#xhs-fmt-toolbar')) {
      closeActivePanel();
    }
  });

  // ---------- 启动 ----------

  async function init() {
    console.log('[小红书排版助手] v1.1.0 插件已加载');

    await initProStatus();
    console.log('[小红书排版助手] 状态:', state.proSource, 'isPro:', state.isPro);

    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
